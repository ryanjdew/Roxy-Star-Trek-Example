/*
Copyright 2002-2014 MarkLogic Corporation.  All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * @fileOverview Map Widget - displays geospatial facet from structured search query via REST server
 * 
 * There are 2 types of map widgets;
 *
 *     pinmap|heatmap: you can set default view between either pinmap or heatmap
 *     gridmap (TBA): density map, not supported in PLEX RELEASE
 *
 * To understand how the map is configured and invoked review the deployed /application/app-config.js and /application/app.js files.
 *
 *     var map_config1={ .... }; <!-- contained in app-config.js --//>
 *   
 *     var map1 = ML.mapWidget("map_canvas","(pinmap|heatmap|gridmap)", map_config1);
 *
 * If grid map is selected, pinmap/heatmap are not available (Note- gridmap is not supported).
 */

/*
### Operation

A query can be performed directly with map using search selection
(polygon) tool which generates a structured search query via
controller.js. This  structured query is in the form of a custom geo
constraint (setup up in search options for geo constraint and defined
in /constraint/geo.xqy).

The custom constraint is closely related to existing geospatial search
baked into search:search API and reuses a large portion of
search:search codebase, with a few caveats. Search boxes returned by
the geo facet that contain a single result also get their uri
returned. This allows the map to dereference marker information
popup. It also means we use only the geo facet (and not results) for
map to operate. The validation for this approach is that geo facet
plus map clustering imparts the maps good performance characteristics
when working on large datasets (using a 'bounding box' query).

On panning and zoom events a 'bounding box' query is initiated that
updates map markers that are in the current map viewing area. As you
zoom in clusters will break down into single points. This query *does*
not update

Queries initiated outside of the map (via widget, search bar or
sidebar) will update 'shadow query' style to maps results.

Clicking onto a single map marker initiates a special getInfo query
via controller.js which resolves the map marker infowindow. The
results shown in a popup infowindow ar rendered using the default xslt
transform extension which is also responsible for displaying a full
results document. By passing in a mode we switch between 2 major
templates in the xsl transformation. The xslt for the default xslt
extension is contained (pre deployment) under the
Assets/appbuilder/components/custom-resource/content.xsl. To adjust
the look and feel of infowindow you would start here, though in theory
you could potentially override by editing custom/content.xsl.

### Status

    gridmap is TBA
    heatmap depends on heatmap.js and friends
    our version of heatmap-gmaps.js and heatmap.js is amended from standard dist
    only 'active' search selection shape is polygon
    box selection shape is used by bounding view search
    clustering is required , no way to deactivate
    shadow query is baked in, no way to deactivate
    we do not use config. properties directly because we need to internally set default values (for custom apps)
    usage of mapstraction is a future foundation, currently it complicates the codebase with mixed google and mapstraction code

### Queries

At any point in time there are a variety of queries which could be in
effect, the following lists all the possible permutations;

    bounding box search (bounds view of the map 'in view' ... this is only for the map to consume)
    bounding box search + current chart
    bounding box search + current sidebar
    bounding box search + current chart + current sidebar
    bounding box search + polygon search
    bounding box search + current chart + polygon search
    bounding box search + current sidebar + polygon search
    bounding box search + current chart + current sidebar + polygon search

there maybe multiple chart widgets each in their own state there maybe
multiple map widgets each in their own state

In queries that invoke box search a flag is appended (data.boundedbox)
which is the basis by which other widgets blanket ignore.

*/
var ML = ML || { };

ML.mapWidget = function (containerID, type, config) {
    "use strict";
    config = (config) ? config : {};

    /************/
    /* Defaults */
    /************/
    var that,
    map,
    widget,
    container,
    renderCB,
    init,
    map_container,
    statusContainer,
    statusContainerId,
    map_status_container,
    drawingManager,
    markerCluster,
    heatmap,
    updateStatus,
    setConstrainPan,
    controlUI,
    selectionUI,
    showMapControl,
    showSelectControl,
    addResultMarkers,
    statusBar,
    infoCallBack,
    resetAll,
    getCirclePoints,
    getBoxPoints,
    getPolyPoints,
    drawGridMap,
    drawHeatmap,
    fixInfoWindowScroll,
    selectUI,
    selectUI0,
    select4UI,
    zoomMarkers,
    updateBoundedView,
    lastValidCenter, lastValidZoom,
    initMapLoad,
    polygonStore, circleStore, boxStore,
    selectedShape, selectedMap,
    subOverlay,
    setupDrawingManager,
    highlightShape,
    setStartingZoom,
    statusUI,
    clearMarkerClusters,
    clearMarkers,
    countGeoFacet,
    grids,
    markers,
    noload;

    // basic setup and sanity check
    that = null;
    map = null;
    noload = 0;
    markers= [];
    selectedShape = '';
    selectedMap = '';
    initMapLoad = 0;

    container = $('#' + containerID);    
    if (container.length === 0) {
      throw('Map widget container ID "' + containerID + '" does not exist');
    };
    if (typeof(type) !== 'string'){
      throw('Map widget parameter "type" has not been set properly');
    };
    
    var getInternetExplorerVersion = function () {
		// Returns the version of Internet Explorer or a -1
		// (indicating the use of another browser).
		var rv = -1, // Return value assumes failure.
			ua,
			re;
		
		if (navigator.appName === 'Microsoft Internet Explorer') {
			ua = navigator.userAgent;
			re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
			if (re.exec(ua) !== null) {
				rv = parseFloat( RegExp.$1 );
			}
		}
		return rv;	
	};
    if (type === 'heatmap') {
    	//due to limitation in heatmap.js we provide fallback to pinmap
    	//in case heatmap has been defined as default view
    	var ieVer = getInternetExplorerVersion();
    	if (ieVer > 8 || ieVer === -1) {
    	    selectedMap = 'heatmap';
    	} else {
	    	selectedMap='pinmap';
		}
    } else if (type === 'gridmap') {
        selectedMap = 'gridmap';
    } else {
        selectedMap = 'pinmap';
    };

    /******************************************/
    /**  configuration with defaults         **/
    /******************************************/

   // as custom apps require reasonable defaults, we provide internally scoped vars instead
   // of directly accessing config.
   
   // it is assumed that a single constraint is used when deployed by appbuilder,
   // but it is possible to provide a separate constraint for either pinmap and heatmap. 
   // constraint names are escaped to handle dashes for js objects (ex. data.test[some-dash])
   var constraint        = config.constraint;
   var geoConstraint     = (config.pinmap && config.pinmap.constraint) ? config.pinmap.constraint : constraint; 
   var heatmapConstraint = (config.heatmap && config.heatmap.constraint) ? config.heatmap.constraint : constraint; 

   // used by controller.js
   var constraintType = (config.constraintType) ? config.constraintType : "geo";
   var dataStream      = (config.datastream) ? config.datastream : "results";

   // maximum objects map will display which is defined by appbuilder 
   var maxDataPoints = (config.maxDataPoints ) ? config.maxDataPoints : 10000;
    
   // position is used to isolate each map widget instantiation, mainly due to usage of element names (versus element objects) by some of our 3rd party libs
   var position = (config.position ) ? config.position : "1";
    
   // appbuilder by default deploys to /application/ level directory, but this can be overriden to supply images from elsewhere
   var imageDir = (config.imageDir ) ? config.imageDir : "/application/images/map/";

   // map legend as defined in appbuilder assemble tab when creating map widget, blank title means its space will be used up by map
   var mapTitle = (config.mapTitle ) ? config.mapTitle : "";

   // map width and height is generally managed by css as widget slots are different from template to template, though as a final 'backstop'  they can be defined here
   // which is useful for custom apps
   var mapWidth  = (config.width ) ? config.width : 485;
   var mapHeight = (config.height ) ? config.height : 300;
    
   // future map widgets may allow different map backends, for now google (specifically v3.9) is all that PLEX supports
   var mapProvider = (config.mapProvider ) ? config.mapProvider : "googlev3";

   // what type of zoom control style to display (large or small)
   var zoomControlType = (config.zoomControlType ) ? config.zoomControlType : "small";

   // display options for switching map tile type (between road maps, etc)
   var showMapTypes = (config.showMapTypes ) ? config.showMapTypes : true;    

   // to enable the display of all map controls
   var showMapControls = (config.showMapControls ) ? config.showMapControls : true;

   // display map widget custom select controls	
   var showSelectControls = config.showSelectControls;

   // images for toolbar
   var toolHandImage     = (config.toolHandImage ) ? config.toolHandImage : imageDir + 'tool-hand.png';
   var toolSquareImage   = (config.toolSquareImage ) ? config.toolSquareImage : imageDir + 'tool-square.png';
   var toolCircleImage   = (config.toolCircleimage ) ? config.toolCircleimage : imageDir + 'tool-circle.png';
   var toolPolygonImage  = (config.toolPolygonImage ) ? config.toolPolygonImage : imageDir + 'tool-polygon.png';
   var toolClearSelImage = (config.toolHandImage ) ? config.toolHandImage : imageDir + 'tool-clearsel.png';
  
   // define zoom min and max
   var minZoomLevel   = (config.minZoomLevel) ? config.minZoomLevel : 1;
   var maxZoomLevel   = (config.maxZoomLevel) ? config.maxZoomLevel : 20;

   // constrain North and South panning
   var constrainPan   = (config.constrainPan) ? config.constrainPan : true;

   // constrain zoom to min and max zoom
   var constrainZoom  = (config.constrainZoom) ? config.constrainZoom : true;

  // at start, zoom to default center
   var autoCenterZoom = (config.autoCenterZoom) ? config.autoCenterZoom : true;

   // at start, zoom on available datapoints
   var autoZoomOnPoints = (config.autoZoomOnPoints) ? config.autoZoomOnPoints : false;
  
   // enable markers to be displayed on pinmap
   var showMarkersOnLoad = (config.showPinmap) ? config.showPinmap : true;

   // search polygon line color
   var searchColor = (config.search && config.search.lineColor) ? config.search.lineColor : "#FF0000";

   // search polygon line opacity
   var searchOpacity = (config.search && config.search.opacity) ? config.search.opacity : 1;

   // search polygon area fill color
   var searchFillColor = (config.search && config.search.fillColor) ? config.search.fillColor : "";

   //search area opacity	
   var searchFillOpacity = (config.search && config.search.fillOpacity) ? config.search.fillOpacity : 0;

   // default icon used for single markers
   var defaultMarkerIcon = (config.pinmap && config.pinmap.defaultIcon) ? config.pinmap.defaultIcon : "/application/images/map_red_shadow.png";

   // information popup window maximum width
   var maxInfoWindowWidth = 275;

   // show pinmap
   var showPinmap = (config.showPinmap) ? config.showPinmap : true;   

   // show gridmap (deactivated)
   var showGridmap = false;   
   
   // show heatmap 
   var showHeatmap = (config.showHeatmap) ? config.showHeatmap : true;     

   // heatmap radius factor defines how much each point contributes e.g. the higher the more intense each point (useful to tweak if you have small or very large datasets)
   var heatMapRadius  = (config.heatmap && config.heatmap.radiusFactor ) ? config.heatmap.radiusFactor : 19;

   // opacity of the heatmap overlay itself
   var heatMapOpacity = (config.heatmap && config.heatmap.opacity) ? config.heatmap.opacity : 60;

   // as with clusters, this defines what number of data points should clustering engage in heatmap
   var heatMapMax = (config.heatmap && config.heatmap.max ) ? config.heatmap.max : 15;

   // you can define the color scheme of the heatmap by amending this value
   var heatMapGradient = (config.heatmap && config.heatmap.gradient) ? config.heatmap.gradient : { 0.45: "rgb(0,0,255)", 0.55: "rgb(0,255,255)", 0.65: "rgb(0,255,0)", 0.95: "yellow", 1.0: "rgb(255,0,0)" };

   // configuration for startingZoom which is used to set a reasonable starting zoom level based
   // on max EAST/WEST coordinates and slot size
   var startingZoom     = 2;
   var startingZoomWest = - 150;
   var startingZoomEast = 150;
    
   // map clustering is always enabled (as map depends on using facets versus results)
   var enableClustering = true; 
	
   // define a minimum number of single marker points to consider when generating a new cluster
   var minClusterSize = (config.clusterGrid) ? config.minClusterSize : 2 ;

   // define a minimum grid size for clustering
   var clusterGrid = (config.clusterGrid) ? config.clusterGrid : 100 ;
    
   // cluster marker styling with intensity increasing from m1 to m5
   var clusterStyles = (config.clusterStyles) ? config.clusterStyles : [ {
        opt_textColor: 'white',
        url: imageDir + 'm1.png',
        height: 53,
        width: 52
    },
    {
        opt_textColor: 'white',
        url: imageDir + 'm2.png',
        height: 55,
        width: 55
    },
    {
        opt_textColor: 'white',
        url: imageDir + 'm3.png',
        height: 65,
        width: 65
    },
    {
        opt_textColor: 'white',
        url: imageDir + 'm4.png',
        height: 78,
        width: 77
    },
    {
        opt_textColor: 'white',
        url: imageDir + 'm5.png',
        height: 90,
        width: 89
    }];
    
    // maximum bounding box used for constraining pan and defining heatmap query limits
    var allowedBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(- 85, - 175),
        new google.maps.LatLng(85, 175)
    );
    
    
    /****************************/
    /**  CREATE WIDGET         **/
    /****************************/
    
    // if map legend is defined use, otherwise have space used up by map itself
    if (mapTitle !== '') {
        container.append('<div class="map_title"><h3>' + mapTitle + '</h3></div>');
        container.append('<div class="map_wrapper with-title">' + '<div id="' + containerID + '-marklogic_widget_container_map_canvas" class="map"></div>' + '<div id="' + containerID + '-map_status_container" class="map_status_container">' + '<div id="' + containerID + '-map_status" class="map_status" />' + '<span class="map_mouse_position" ></span>' + '</div>' + '</div>');
    } else {
        container.append('<div class="map_wrapper">' + '<div id="' + containerID + '-marklogic_widget_container_map_canvas" class="map"></div>' + '<div id="' + containerID + '-map_status_container" class="map_status_container">' + '<div id="' + containerID + '-map_status" class="map_status" />' + '<span class="map_mouse_position" ></span>' + '</div>' + '</div>');
    }
    map_container = $('#' + containerID + '-marklogic_widget_container_map_canvas');
    map_status_container = $('#' + containerID + '-map_status_container');
    statusContainerId = containerID + "-map_status_container";
    statusContainer = $('#' + statusContainerId);
    statusContainer.attr('title', 'Click to hide status');
    statusContainer.hide();
    statusContainer.click(function() {
        statusContainer.hide();
    });
    
    
    /************************/
    /**  CONTROL HANDLERS **/
    /***********************/
    
    // starting zoom calculated based on defining comfortable longitude (East and West) limits in view
    setStartingZoom = function () {
        var west = startingZoomWest;
        var east = startingZoomEast;
        var angle = east - west;
        if (angle < 0) {
            angle += 360;
        }
        startingZoom = Math.round(Math.log(map_container.width() * 360 / angle / 256) / Math.LN2);
        map.setCenterAndZoom(new mxn.LatLonPoint(39, - 28), startingZoom);
    };
    
    // status container provdies information on data quality, this function updates status div
    updateStatus = function (message) {
        if (message) {
            statusContainer.html('<img id="innerwarning" style="float:left; margin-left:8px;" height="16" width="16" src="' + imageDir + 'toolbar_warning.png" />' + message);  
            //$('img#warning' + position).show();
            google.maps.event.addListener(map.getMap(), 'click', function () {
                statusContainer.hide();
            });       
        }
    };
        
    // sets a listener that checks if map panning is allowed. This function
    // disallows panning all the way North or South to avoid getting map whitespace
    setConstrainPan = function () {
        google.maps.event.addListener(map.getMap(), 'center_changed', function () {
            statusContainer.hide();
            if (map.getMap().getBounds()) {
                if ((allowedBounds.getNorthEast().lat() > (map.getMap().getBounds().getNorthEast().lat())) && (allowedBounds.getSouthWest().lat() < (map.getMap().getBounds().getSouthWest().lat()))) {
                    // still within valid bounds, so save the last valid position
                    lastValidCenter = map.getMap().getCenter();
                    return;
                }
                // point not valid anymore => return to last valid position
                if (map.getMap().getBounds().getNorthEast().lat() > 80) {
                    map.getMap().panTo(new google.maps.LatLng(lastValidCenter.lat() - 1, lastValidCenter.lng()));
                } else {
                    map.getMap().panTo(new google.maps.LatLng(lastValidCenter.lat() + 1, lastValidCenter.lng()));
                }
                lastValidCenter = map.getMap().getCenter();
            }
        });
        
        // set up listeners for updating marker results for pinmaps (could be moved)
        google.maps.event.addListener(map.getMap(), 'dragend', function () {
          updateBoundedView();
        });
        google.maps.event.addListener(map.getMap(), 'zoom_changed', function () {
		clearMarkers();
		clearMarkerClusters();
		updateBoundedView();
        });
    };
    
    /*
    *  Setup Map controls
    *
    *   pinmap/heatmap/gridmap controls   - switch between the 3 different map types
    *   search selection controls - search selection controls
    *
    */
    controlUI = function (controlDiv, map) {
        // Set pinmap control
        var controlPinMapUI = document.createElement('div');
        controlPinMapUI.className = 'controlUIPinMap';
        controlPinMapUI.title = 'Show Pin Map';
        controlPinMapUI.innerHTML = '<img src=\"' + imageDir + 'tool-pinmap.png\" />';
        if(showPinmap) controlDiv.appendChild(controlPinMapUI);
        // Set heatmap control.
        var controlHeatMapUI = document.createElement('div');
        controlHeatMapUI.className = 'controlUIHeatMap';
        controlHeatMapUI.title = 'Show Heatmap';
        controlHeatMapUI.innerHTML = '<img src=\"' + imageDir + 'tool-heatmap.png\" />';
        if(showHeatmap) controlDiv.appendChild(controlHeatMapUI);
        // Set gridmap control.
        var controlGridMapUI = document.createElement('div');
        controlGridMapUI.className = 'controlUIGridMap';
        controlGridMapUI.title = 'Show Gridmap';
        controlGridMapUI.innerHTML = '<img src=\"' + imageDir + 'tool-heatmap.png\" />';
        if(showGridmap) controlDiv.appendChild(controlGridMapUI);
                
        google.maps.event.addDomListener(controlPinMapUI, 'click', function () {
            if (heatmap) {
                heatmap.toggle();
                heatmap.setMap(null);
                heatmap = null;
                google.maps.event.clearListeners(map.getMap(), 'idle');
                google.maps.event.clearListeners(map.getMap(), 'resize');
            }
            statusContainer.hide();
            selectedMap = 'pinmap';
            highlightSelectedMap();
            initMapLoad = 0;
            container.trigger('getBox', {
                facet: constraint,
                datastream: constraintType + position,
                annotation: selectedMap + ',' + map.getMap().getZoom(),
                geo: {
                    box: getBoxPoints(map.getMap())
                }
            });
        });
        google.maps.event.addDomListener(controlHeatMapUI, 'click', function () {
            statusContainer.hide();
            selectedMap = 'heatmap';
            highlightSelectedMap();
            initMapLoad = 0;
            container.trigger('getBox', {
                facet: constraint,
                datastream: constraintType + position,
                annotation: selectedMap + ',' + map.getMap().getZoom(),
                geo: {
                    box: getBoxPoints(map.getMap())
                }
            });
        });
         google.maps.event.addDomListener(controlGridMapUI, 'click', function () {
            statusContainer.hide();
            selectedMap = 'gridmap';
            highlightSelectedMap();
            initMapLoad = 0;            
            container.trigger('getBox', {
                facet: constraint,
                datastream: constraintType + position,
                annotation: selectedMap + ',' + map.getMap().getZoom(),
                geo: {
                    box: getBoxPoints(allowedBounds)
                }
            });
        });       
        
        google.maps.event.addDomListener(controlHeatMapUI, 'load', function () {
            highlightSelectedMap();
        });
    
        var highlightSelectedMap = function () {
            controlPinMapUI.style.backgroundColor = 'white';
            controlHeatMapUI.style.backgroundColor = 'white';
            controlGridMapUI.style.backgroundColor = 'white';
            switch (selectedMap) {
                case 'heatmap':
                controlHeatMapUI.style.backgroundColor = '#CBCBCB';
                break;
                case 'pinmap':
                controlPinMapUI.style.backgroundColor = '#CBCBCB';
                break;
                case 'gridmap':
                controlGridMapUI.style.backgroundColor = '#CBCBCB';
                break;
                default:
            }
        };
        highlightSelectedMap();
    };
    
    // selection custom control
    selectionUI = function (controlDiv, map) {
        controlDiv.style.padding = '5px';
        // Set drawing control
        selectUI0 = document.createElement('div');
        selectUI0.className = 'selectUI';
        selectUI0.title = 'Drag Map';
        selectUI0.innerHTML = '<img src="' + toolHandImage + '" />'; 
        controlDiv.appendChild(selectUI0);
        
        google.maps.event.addDomListener(selectUI0, 'click', function () {
            //resetAll();
            selectedShape = '';
            highlightShape();
            drawingManager.setDrawingMode(null);
        });
        
        // Set square control
        var select2UI = document.createElement('div');
        select2UI.className = 'selectUI';
        select2UI.title = 'Select square';
        select2UI.innerHTML = '<img src="' + toolSquareImage + '" />'; 
        //controlDiv.appendChild(select2UI);
        
        google.maps.event.addDomListener(select2UI, 'click', function () {
            resetAll();
            selectedShape = 'rectangle';
            highlightShape();
            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
        });
        
        // set circle control
        var select3UI = document.createElement('div');
        select3UI.className = 'selectUI';
        select3UI.title = 'Select circle';
        select3UI.innerHTML = '<img src="' + toolCircleImage + '" />';
        //controlDiv.appendChild(select3UI);
        
        google.maps.event.addDomListener(select3UI, 'click', function () {
            resetAll();
            selectedShape = 'circle';
            highlightShape();
            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.CIRCLE);
        });
        
        // set polygon control
        select4UI = document.createElement('div');
        select4UI.className = 'selectUI';
        select4UI.title = 'Draw Shape';
        select4UI.innerHTML = '<img src="' + toolPolygonImage + '" />';
        controlDiv.appendChild(select4UI);
        
        google.maps.event.addDomListener(select4UI, 'click', function () {
            resetAll();
            selectedShape = 'polygon';
            highlightShape();
            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        });
        
        // reset selection control
        selectUI = document.createElement('div');
        selectUI.className = 'selectUIReset';
        selectUI.title = 'Clear Shape';
        selectUI.innerHTML = '<img src="' + toolClearSelImage + '" />';
        controlDiv.appendChild(selectUI);
        
        google.maps.event.addDomListener(selectUI, 'click', function () {
            selectUI.style.backgroundColor = '#CBCBCB';
            selectedShape = '';
            highlightShape();
            drawingManager.setDrawingMode(null);
            resetAll();
            noload=1;
            container.trigger('selection', {
                facet: constraint
            });
        });
        highlightShape();
    };
    
    highlightShape = function () {
        selectUI.style.backgroundColor = 'white';
        selectUI0.style.backgroundColor = 'white';
        select4UI.style.backgroundColor = 'white';
        switch (selectedShape) {
            case 'reset':
            selectUI.style.backgroundColor = '#CBCBCB';
            break;
            case 'polygon':
            select4UI.style.backgroundColor = '#CBCBCB';
            break;
            default:
            selectUI0.style.backgroundColor = '#CBCBCB';
        }
    };
    
    showMapControl = function () {
        var controlDiv = document.createElement('div');
        var control = new controlUI(controlDiv, map);
        controlDiv.index = 1;
        map.getMap().controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);
    };
    
    showSelectControl = function () {
		if (showSelectControls) {
	        var selectionDiv = document.createElement('div');
	        var selection = new selectionUI(selectionDiv, map);
	        selectionDiv.index = 1;
	        map.getMap().controls[google.maps.ControlPosition.LEFT_TOP].push(selectionDiv);
		}
    };
    
    
    /**********************/
    /**  MARKER HANDLERS **/
    /**********************/
    /*
    *   Markers are used with pinmaps and are the basis for displaying information and are used
    *   in conjunction with clustering (and geospatial facet).
    *
    *     addResultMarkers(data) - generates markers and clusters
    *     countGeoFacet(data) - total result count of geo constraint facet
    *     statusBar(data) - output any warning messages associated with data quality (yellow triangle)
    *     infoCallBack(infowindow, marker) - callback that triggers getInfoWindow event for populating marker info popup
    *
    */

   // clears map of markers
    clearMarkers = function(){
        if(markers){
            for (var i = 0; i < markers.length; i++ ) {
                markers[i].setMap(null);
            }
        }
	markers=[];
     }   
     
    // clears map of any cluster icons
    clearMarkerClusters = function(){
        if (markerCluster) {       
            markerCluster.clearMarkers();
        }
    };
    
    zoomMarkers=function(){
      var limitBounds = new google.maps.LatLngBounds();
      if(markers.length > 0){
      for(var i in markers) {
        var ll = new google.maps.LatLng(markers[i].position.Xa, 
                                            markers[i].position.Ya);
        limitBounds.extend(ll);
      }
      map.getMap().fitBounds(limitBounds); 
      }
    };
  
    // adds markers and marker clusters
    addResultMarkers = function (data) {
        var markerData = data.facets[geoConstraint].boxes;
        if (markerData !== undefined && markerData !== null) {
            var len = markerData.length;
            var i;           
             for (i = 0; i < len; i = i + 1) {
                var point = markerData[i];
                var centerBounds = new google.maps.LatLngBounds(new google.maps.LatLng(point.s, point.w), new google.maps.LatLng(point.n, point.e));
                var center = centerBounds.getCenter();
                var c = point.count;
                if(point.count === 1){
                  var m = new google.maps.Marker({
                        position: new google.maps.LatLng(point.s, point.w),
                        icon: defaultMarkerIcon
                  });
                  var infowindow = new google.maps.InfoWindow({
                        content: point.uri,
                        maxWidth: maxInfoWindowWidth
                  });
                  google.maps.event.addListener(m, 'click', infoCallBack(infowindow, m, c));
                  markers.push(m);                
                }else{
                 var g;
                 for (g = 0; g < c; g = g + 1) {
                    var m = new google.maps.Marker({
                        position: new google.maps.LatLng(center.lat(), center.lng()),
                        icon: defaultMarkerIcon
                    });
                    var infowindow = new google.maps.InfoWindow({
                        content: point.uri,
                        maxWidth: maxInfoWindowWidth
                    });
                    markers.push(m);
                 }   
             }
            }
	    clearMarkerClusters();
            markerCluster = null;
            var currentClusterGrid = Math.round( clusterGrid / map.getMap().getZoom());
            markerCluster = new MarkerClusterer(map.getMap(), markers, {
              gridSize: currentClusterGrid,
	      maxZoom: 25,	
              styles: clusterStyles, 
              averageCenter: true, 
              zoomOnClick: false,
              title:"search results",
	      minimumClusterSize: minClusterSize
            });
         
            // when marker cluster is clicked it should zoom in by 1 factor
            // this is required for new pan/zoom query to populate bounded view
            google.maps.event.addListenerOnce(markerCluster, "click", function (c) {   
                map.getMap().setCenter(c.getCenter());                
                map.getMap().setZoom(map.getMap().getZoom() + 1);
            });
        }
    };
    
    countGeoFacet = function (data) {
        return data.facets[geoConstraint].count;
    };
    
   /*
    *   calculates statusbar message returning information on 2 conditions
    *
    *     if maximum data points is reached - 'showing top #x of #total results'
    *     if some results are missing geospatial information - '#x of #toal missing geospatial' 
    *
    */
    statusBar = function (data) {
        statusContainer.hide();
        var count = countGeoFacet(data);
        var warningEl = $('img#warning' + position);
        
        if (warningEl.length === 0) {
        	var statusDiv = $('<div class="statusUIParent"></div>');
			map.getMap().controls[google.maps.ControlPosition.LEFT_BOTTOM].push(statusDiv[0]);
        	
        	var statusUI1 = $('<div class="statusUI" title="Click to view information"></div>');
			warningEl = $('<img id="warning' + position + '" style="display:none;" height="16" width="16" src="' + imageDir + 'toolbar_warning.png" />');
			statusUI1.append(warningEl);
			statusDiv.append(statusUI1);
			google.maps.event.addDomListener(statusUI1[0], 'click', function () {
			    statusContainer.toggle();
			});
        }
        
        if (data.boundedbox ) {

        } else if ( polygonStore || !data.facets[geoConstraint].boxes) {
            warningEl.hide();
        } else if (data.total !== 0 || count != undefined || (data.total - count) != 0) {
            if (data.total > maxDataPoints) {
                updateStatus('showing top ' + maxDataPoints + ' of ' + data.total + ' results ');
                warningEl.show();
            } else if ((data.total - count) === 0) {
            	warningEl.hide();
            } else {
                updateStatus((data.total - count) + ' of ' + data.total + ' missing geospatial data');
                warningEl.show();
            }
        }
    };
    
    // infowindow inline overflow definition fix, 25ms wait for overlay to appear
    fixInfoWindowScroll = function () {
        // IE requires more time for infowindow to appear, so we use an interval to check for it's existence.
        // We cannot simply run an check over and over till our infowindow appears, as other
        // windows may be up, triggering a false positive.  So we will wipe all infowindows of
        // overflow for 1/2 of a second, every 25ms, to be sure we get them all.
        var timeChecked = 0,
        totalTimeToCheck = 500,
        intervalToCheck = 25,
        checkForOverlow = setInterval(function () {
            $('.infowindow').parent().parent().css('overflow', '');
            timeChecked = timeChecked + intervalToCheck;
            if (timeChecked >= totalTimeToCheck)
            clearInterval(checkForOverlow);
        },
        intervalToCheck);
    };
    
    // callback which generates marker popup infowindow (ajax call is performed in controller.js getInfo)
    infoCallBack = function infoCallback(infowindow, marker, c) {
        return function () {
            infowindow.close();
            if (c === 1 && infowindow.getContent()) {
                container.trigger('getInfoWindow', {
                    map: map.getMap(), 
                    uri: infowindow.getContent(), 
                    marker: marker, 
                    infowindow: infowindow, 
                    callback: function () {
                        fixInfoWindowScroll();
                    }
                }); 
            } else if (c > 1 && infowindow.getContent()) {
                var uri = infowindow.getContent();
                var i = 0;
                
                if (uri) {
                    var uriArray = uri.split(',');
                    var links = ""; 
                    
                    for (i = 0; i < uriArray.length; i = i + 1) {
						if (config.proxy) {
							link = '<a href="' +
								config.proxy + '?uri=' + uriArray[i] + '&proxyPath=/' + config.version + '/documents' +
								'" target="doc">#' + (i + 1) + '</a> ';
							} else {
								link = '<a href="/v1/documents?uri=' + uriArray[i] + '" target="doc">#' + (i + 1) + '</a> ';
							}
                    }                
                    
                    infowindow.setContent(' <div class="infowindow"><strong>Multiple (' + c + ') data points</strong><br/><p>' + links + '</p></div>') 
                } else {
                    infowindow.setContent(' <div class="infowindow"><strong>Multiple (' + c + ') data points</strong><br/><p></p></div>')                 
                }
                
                infowindow.open(map.getMap(), marker);
                fixInfoWindowScroll();
            } else {
                infowindow.setContent(' <div class="infowindow"><strong>Problem retrieving data points</strong><br/><p></p></div>')                 
                infowindow.open(map.getMap(), marker);
                fixInfoWindowScroll();
            }
        };
    };


    /**********************/
    /**  SEARCH HANDLERS **/
    /**********************/
    /*
    *  Search using polygon shape.
    *
    *   resetAll() - sets all search selection shapes to null
    *   getCirclePoints() (UNSUPPORTED) - generates points for custom geo constraint from a circle
    *   getBoxPoints() - generates points for custom geo constraint from bounded box ( updateBoundedView() )
    *   getPolyPoints() - generates points for custom geo constraint from search polygon
    *
    */
    resetAll = function () {
        if (circleStore) {
            circleStore.setMap(null);
            circleStore = null;
        }
        if (boxStore) {
            boxStore.setMap(null);
            boxStore = null;
        }
        if (polygonStore) {
            polygonStore.setMap(null);
            polygonStore = null;
        }
        statusContainer.hide();
    };
    
    getCirclePoints = function (circle) {
        var circ = {
        };
        circ.radius = (0.000621371192237334) * circle.getRadius();
        // convert miles to meters due to ML circle default setting being defined in miles
        circ.point = {
        };
        circ.point.latitude = circle.getCenter().lat();
        circ.point.longitude = circle.getCenter().lng();
        return circ;
    };
    
    getBoxPoints = function (box) {
        var rect =[];
        var bounds;
        try{ 
         bounds = box.getBounds();
        }catch(err){
         bounds = box;
        }
        var n = bounds.getNorthEast().lat();
        var e = bounds.getNorthEast().lng();
        var s = bounds.getSouthWest().lat();
        var w = bounds.getSouthWest().lng();
        rect.push({
            ne: {
                "lat": n,
                "lng": e
            }
        });
        rect.push({
            sw: {
                "lat": s,
                "lng": w
            }
        });
        return rect;
    };
    
    getPolyPoints = function (polygon) {
        var poly =[];
        var path = polygon.getPath();
        var plength = path.getLength();
        var i;
        for (i = 0; i < plength; i = i + 1) {
            var lat = polygon.getPath().getAt(i).lat();
            var lng = polygon.getPath().getAt(i).lng();
            poly.push({
                "latitude": lat,
                "longitude": lng
            });
        }
        return poly;
    };
    

    /****************************/
    /**  GRIDMAP               **/
    /****************************/
    /* 
    * NOT SUPPORTED IN 6.0 RELEASE
    */

     var clearGrid = function(){
        if(grids){
        for (i = 0; i < grids.length; i = i + 1) {
            grids[i].setMap(null);
        }
    }
    };
    
  drawGridMap = function (data) {
   grids =[];
   // the following will get extruded to map config
   var clickable = false;
   var strokeColor = '#FF0000';
   var strokeOpacity = .5;
   var strokeWeight = 1;
   var fillColor = '#FF0000';
   var fillOpacity = 0;
   var startingFillOpacity = .1;

   var baseopts = {
            map: map.getMap(),
            clickable: clickable,
            strokeColor: strokeColor,
            strokeOpacity: strokeOpacity,
            strokeWeight: strokeWeight,
            fillColor: fillColor,
            fillOpacity: fillOpacity + startingFillOpacity
        };
   
   var gridData = data.facets[geoConstraint].boxes;
   var total = data.facets[geoConstraint].count;
   
   if (gridData) {
     var len = gridData.length;
     var i;           
     for (i = 0; i < len; i = i + 1) {
       var box = gridData[i];
       var opts = baseopts;
       opts['bounds'] = {};
       if(box.count ==0 ) {
         opts.fillOpacity = 0;
       }else if(box.count == 1){
         opts.fillOpacity = startingFillOpacity;}
       else{
         opts.fillOpacity =  (1 - startingFillOpacity) * (box.count / total) + startingFillOpacity;
       }
       opts['bounds'] = new google.maps.LatLngBounds(
         new google.maps.LatLng(box.s , box.w ),
         new google.maps.LatLng(box.n , box.e ));
       grids.push(new google.maps.Rectangle(opts));
     }
   }
   
   google.maps.event.addListenerOnce(map.getMap(), 'zoom_changed', function () {
     clearGrid();
   });
 };
        
    
    /****************************/
    /**  HEATMAP               **/
    /****************************/
    /*
    *  Heatmap overlay uses geo facet to display a contiugous density image overlay.
    *
    *  The overlay requires lat, lng and count of results. The lat and lng represent the
    *  center point of the facet box.
    *
    *  1) if existing heatmap, clear out
    *  2) initiate heatmap overlay (via heatmaps-gmap.js, which deps on heatmap.js)
    *  3) consume constraint facet
    *  4) each facet box center is determined and pumped into data structure heatmap.js requires
    *  5) what for 'idle' event then pump in data
    *  6) setup listeners that will properly redraw
    *
    *  Note - that our version of heatmap-gmaps.js and heatmap.js have been amended to fix specific
    *  redraw issues and deviate from standard distribution
    *
    */
    drawHeatmap = function (data) {
	clearMarkers();
	clearMarkerClusters();
	
        //clear away any heatmap data, if it already exists
        if (heatmap) {
            heatmap.toggle();
            heatmap.setMap(null);
            heatmap = null;
        }
        
        // init heatmap overlay
        heatmap = new HeatmapOverlay(map.getMap(), {
            "radius": heatMapRadius,
            "visible": true,
            "opacity": heatMapOpacity,
            "gradient": heatMapGradient
        });
        
        // heatmap facet
        var heatmapData = data.facets[heatmapConstraint].boxes;
        
        if (heatmapData) {
            var d =[];
            var i, len;
            // facet data is based on grids, we will loop through each
            // box and determine its center.
            for (i = 0, len = heatmapData.length; i < len; i = i + 1) {
                var point = heatmapData[i];
                var sw = new google.maps.LatLng(point.s, point.w);
                var ne = new google.maps.LatLng(point.n, point.e);
                var centerBounds = new google.maps.LatLngBounds(sw, ne);
                var center = centerBounds.getCenter();
                // get center of grid
                var c = point.count;
                d.push({
                    "lat": center.lat(),
                    "lng": center.lng(),
                    "count": c
                });
            }

	    
        //this code block is safer then waiting for idle event
        var timeChecked = 0,
        totalTimeToCheck = 200,
        intervalToCheck = 15,
        
        checkForOverlay = setInterval(function () {
            timeChecked = timeChecked + intervalToCheck;
            if(heatmap.heatmap){
               heatmap.setDataSet({
                    max: heatMapMax,
                    data: d
                });                    
            google.maps.event.addListener(map.getMap(), 'idle', function () {
                heatmap.draw();
            });
            google.maps.event.addListener(map.getMap(), 'resize', function () {
                heatmap.draw();
            });
            //map.setCenterAndZoom( new mxn.LatLonPoint(map.getCenter().lat, map.getCenter().lng + (Math.random() * .00001)), map.getZoom());
            //google.maps.event.trigger(map.getMap(), 'resize');
            clearInterval(checkForOverlay);                      
            }
        if (timeChecked >= totalTimeToCheck)
            clearInterval(checkForOverlay);
        },
        intervalToCheck);        
        }
    };
    
    /************************/
    /** Drawing init       **/
    /************************/
    setupDrawingManager = function () {
        drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: google.maps.drawing.OverlayType.POLYGON,
            drawingControl: false,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes:[google.maps.drawing.OverlayType.CIRCLE, google.maps.drawing.OverlayType.RECTANGLE, google.maps.drawing.OverlayType.POLYGON]
            },
            circleOptions: {
                strokeColor: searchColor,
                strokeOpacity: searchOpacity,
                strokeWeight: 1,
                fillColor: searchFillColor,
                fillOpacity: searchFillOpacity,
                editable: true
            },
            rectangleOptions: {
                strokeColor: searchColor,
                strokeOpacity: searchOpacity,
                strokeWeight: 1,
                fillColor: searchFillColor,
                fillOpacity: searchFillOpacity,
                editable: true
            },
            polygonOptions: {
                strokeColor: searchColor,
                strokeOpacity: searchOpacity,
                strokeWeight: 1,
                fillColor: searchFillColor,
                fillOpacity: searchFillOpacity,
                editable: true
            }
        });
        
        drawingManager.setMap(map.getMap());
        
        // polygon shape search
        google.maps.event.addListener(drawingManager, 'polygoncomplete', function (polygon) {
            polygonStore = polygon;
            selectedShape = '';
            drawingManager.setDrawingMode(null);
            noload = 1;
            if (getPolyPoints(polygonStore).length <= 1) {
            	resetAll();
                selectedShape = 'polygon';
                highlightShape();
                drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
            	return true;
            };
            container.trigger('selection', {
                facet: constraint,
                datastream: constraintType + position,               
                annotation: selectedMap + ',' + map.getMap().getZoom(),
                geo: {
                    poly: getPolyPoints(polygon)
                }
            });
            
            google.maps.event.addListener(polygonStore.getPath(), 'set_at', function () {
                container.trigger('selection', {
                    facet: constraint,
                    datastream: constraintType + position,               
                    annotation: selectedMap + ',' + map.getMap().getZoom(),
                    geo: {
                        poly: getPolyPoints(polygonStore)
                    }
                });
            });
            google.maps.event.addListener(polygonStore.getPath(), 'insert_at', function () {
                container.trigger('selection', {
                    facet: constraint,
                    datastream: constraintType + position,               
                    annotation: selectedMap + ',' + map.getMap().getZoom(),
                    geo: {
                        poly: getPolyPoints(polygonStore)
                    }
                });
            });
        });
        
        //edit polygon after creation
        if (polygonStore) {
            polygonStore.setMap(map.getMap());
            google.maps.event.addListener(polygonStore.getPath(), 'set_at', function () {
                container.trigger('selection', {
                    facet: constraint,
                    datastream: constraintType + position,               
                    annotation: selectedMap + ',' + map.getMap().getZoom(),
                    geo: {
                        poly: getPolyPoints(polygonStore)
                    }
                });
            });
            google.maps.event.addListener(polygonStore.getPath(), 'insert_at', function () {
                container.trigger('selection', {
                    facet: constraint,
                    datastream: constraintType + position,               
                    annotation: selectedMap + ',' + map.getMap().getZoom(),
                    geo: {
                        poly: getPolyPoints(polygonStore)
                    }
                });
            });
        }

    };

    // map requires update on change to pan or zoom, to ensure we can dereference marker results
    // from geo facet.
    updateBoundedView = function () {
        if (!polygonStore || initMapLoad) {
            //this query's results should only be consumed by the map
            container.trigger('getBox', {
                facet: constraint,
                datastream: constraintType + position,
                annotation: selectedMap + ',' + map.getMap().getZoom() ,
                geo: {
                    box: getBoxPoints(map.getMap())
                }
            });
        }
    };
    
    /************************/
    /** renderCB           **/
    /************************/
    /*
    * callback that is invoked whenever controller returns data
    *
    */  
    renderCB = function (data) {
		if (selectedMap == "pinmap" && noload === 0) {
		    clearMarkers();
		    clearMarkerClusters();
	    }
	    
	    //statusBar(data);
	    
	    if (noload === 0 
	    		&& (data.start === 1 || initMapLoad === 0 || data.boundedbox )) {
	        selectedShape = '';
	        (showSelectControls) ? highlightShape() : null;
	        drawingManager.setDrawingMode(null);
	
	        if (showHeatmap && selectedMap == "heatmap") {
				drawHeatmap(data);
	            statusBar(data);                
	        } else if (showMarkersOnLoad && selectedMap == "pinmap") {
	        	addResultMarkers(data);
	            statusBar(data);
	        } else if (selectedMap == "gridmap") {
	            clearGrid();
	            drawGridMap(data);
	            statusBar(data);
	        } else {
	        	statusBar(data);
	        }
	    } else {
	    	statusBar(data);
	    }
		
	    if (initMapLoad === 0 && autoZoomOnPoints) {
	    	zoomMarkers();
		}
		
	    initMapLoad = 1;
		noload = 0;
	};

    
    /************************/
    /** Map widget init    **/
    /************************/
    /*
    * instantiate mapstraction object, setup map options, add standard map controls
    *
    */
    init = function () {
        map = new mxn.Mapstraction(containerID + '-marklogic_widget_container_map_canvas', mapProvider);
        map.getMap().setOptions({
            minZoom: minZoomLevel,
            maxZoom: maxZoomLevel
        });
        map.addControls({
            pan: false,
            zoom: Boolean (zoomControlType),
            map_type: Boolean (showMapTypes)
        });
        //setting an initial center is required to initialise map
        map.getMap().setCenter(new google.maps.LatLng(39, - 28));
        
        (autoCenterZoom) ? setStartingZoom(): null;

        if (getInternetExplorerVersion() > 8 || getInternetExplorerVersion() === -1) {
        	// only show map controls outside of ie8,
        	// as ie8 only supports pinmaps, thus requires
        	// no controls to switch between heat and pin maps
        	(showMapControls) ? showMapControl() : null;
        }
        (constrainPan) ? setConstrainPan() : null;
        lastValidCenter = map.getMap().getCenter();
	(showSelectControls) ? showSelectControl() : null;
	setupDrawingManager();
    };

    // instantiate widget and init()
    widget = ML.createWidget(container, renderCB, constraint, constraintType);
    init();

    // used by tests
    if (ML.DEBUG) {
        that = {
            privateVariables: function () {
                return {
                    map: map,
                    circle: circleStore,
                    poly: polygonStore,
                    box: boxStore,
                    containerID: containerID,
                    container: container,
                    config: config,
                    points: markers
                };
            }
        };
    }
    
    return that;
};
