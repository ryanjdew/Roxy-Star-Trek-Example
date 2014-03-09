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
var ML = ML || {};
ML.controller = (function () {
	"use strict";
	
	// returned object
	var that,
	
	// private properties
		config,
		oldQuery,
		errorParsed,
		errorDetails,
		facetTypes,
		searchEndpoint,
		valueEndpoint,		
		
	// private methods

		
	// private object
		comm,
		
	// public methods
		init,
		getData;
	
	
	// default variables
	config = {
		appWrapper: "body",
		widgetClass: ".widget",
		version: "v1", // version number of the REST API
		proxy: false, // proxy url - defaults to false for no proxy
		optionsNode: "all",
		queryPage: 1,
		pageLength: 10,
		useShadows: true, // global toggle for shadow queries
		enableBookmarking: true, // toggle for bookmarking suppport
		bookmarkingDelimiters: ['*_*', '*__*'] // delimiters to be used while encoding url bookmarks
	};
	
	searchEndpoint = "/" + config.version + "/search";
	valueEndpoint = "/" + config.version + "/values";
	
	oldQuery = {facets:{}};
	facetTypes = {};
	
	// create comm object
	// ----------------------------------------------------------------------->
	comm = (function () {
		var that,
		
		// private properties
			queryRegistry,
			
		// private methods
			refreshData,
			toSQuery,
		
		// public methods
			getData,
			updateQuery,
			getBox,
			getInfo,
			getBounds;
		
		queryRegistry = (function () {
			var registry;
			
			registry = [];
			
			return {
				clear: function () {
					var i,
						l = registry.length;
					
					for (i = 0; i < l; i = i + 1) {
						registry[i].abort();
					}
					
					registry = [];
				},
				register: function (jqxhr) {
					registry.push(jqxhr);
				}
			};
		}());
		
		$.ajaxSetup({
            error: function(resp) {
            	// If we recognize response object, display a nice message
            	if (resp) {
                	if (resp !== "") {
                		if (resp.statusText !== 'abort' && resp.responseText) { // don't error on aborted calls
                    		errorParsed = JSON.parse(resp.responseText);
                    		errorDetails = errorParsed.error['status-code'] + ' ' + errorParsed.error['status'] + ' - ' + errorParsed.error['message'];
                    		$(config.appWrapper).trigger('error', errorDetails);
                		}
                	// Else display the best we can
                	} else {
                		$(config.appWrapper).trigger('error', "Server Error: " + resp.toString());
                	}
            	}
            }
		});
  
		//private methods
		toSQuery = function (query) {
			var sQuery = {},
				facet = "",
				first = true,
				type,
				facetQ,
				sortQ,
				sortObj;
			
			sQuery.query = {}; // don't be confused by the nomenclature collision. This is a structured query query element, not a widget app query
			
			if (query.text) {
				sQuery.query.qtext = decodeURIComponent(query.text);
			}
			
			// this function is no longer used. It's an abstraction of performing a bounded range structured query (ie; 5 < x < 10)
//			var toBoundedRange = function (name, val, operator) {
//				var rangeConstraint = {};
//				rangeConstraint["range-constraint-query"] = {};
//				rangeConstraint["range-constraint-query"]["constraint-name"] = name;
//				rangeConstraint["range-constraint-query"].value = [val];
//				rangeConstraint["range-constraint-query"]["range-operator"] = operator;
//				return rangeConstraint;
//			};
			
			for (facet in query.facets) {
				if (query.facets.hasOwnProperty(facet)) {
					if (first) {
						sQuery.query["and-query"] = {};
						sQuery.query["and-query"].queries = [];
						first = false;
					}
									
					type = query.facets[facet].constraintType;
					
					facetQ = {};					
					if (type === 'range') {
						facetQ["range-constraint-query"] = {};
						facetQ["range-constraint-query"]["constraint-name"] = facet;
						facetQ["range-constraint-query"].value = query.facets[facet].value; // should be a singleton array
					} else if (type === 'collection') {
						facetQ["collection-constraint-query"] = {};
						facetQ["collection-constraint-query"]["constraint-name"] = facet;
						facetQ["collection-constraint-query"].uri = query.facets[facet].value;
					} else if (type === 'geo') {
						delete sQuery.query["and-query"].queries["custom-constraint-query"];
						facetQ["custom-constraint-query"] = {};
						facetQ["custom-constraint-query"]["constraint-name"] = facet;
						if(query.facets[facet].geo.poly) {
							facetQ["custom-constraint-query"].polygon = {};
							facetQ["custom-constraint-query"].polygon.point = query.facets[facet].geo.poly;
						} else if (query.facets[facet].geo.box) {
							facetQ["custom-constraint-query"].box = {};
							facetQ["custom-constraint-query"].box.south = query.facets[facet].geo.box[1].sw.lat;
							facetQ["custom-constraint-query"].box.west = query.facets[facet].geo.box[1].sw.lng;
							facetQ["custom-constraint-query"].box.north = query.facets[facet].geo.box[0].ne.lat;
							facetQ["custom-constraint-query"].box.east = query.facets[facet].geo.box[0].ne.lng;
						} else if (query.facets[facet].geo.circle) {
							facetQ["custom-constraint-query"].circle = {};
							facetQ["custom-constraint-query"].circle.radius = query.facets[facet].geo.circle.radius;
							facetQ["custom-constraint-query"].circle.point = {};
							facetQ["custom-constraint-query"].circle.point.latitude = query.facets[facet].geo.circle.point.latitude;
							facetQ["custom-constraint-query"].circle.point.longitude = query.facets[facet].geo.circle.point.longitude;
						}
                    } else if (type === 'custom') {
                        facetQ["custom-constraint-query"] = {};
                        facetQ["custom-constraint-query"]["constraint-name"] = facet;
                        facetQ["custom-constraint-query"].text = query.facets[facet].value[0]; 
					} else {
						throw "Error: unknown constraint type: " + type + " for constraint: " + facet;
					}
					
					sQuery.query["and-query"].queries.push(facetQ);
				}
			}
			
			if (query.sort) {
				if (first) {
					sQuery.query["and-query"] = {};
					sQuery.query["and-query"].queries = [];
					first = false;
				}
				sortQ = {};
				// Example: {"operator-state":[{"operator-name":"sort", "state-name":"down"}]}
				sortQ["operator-state"] = [];
				sortObj = {};
				sortObj["operator-name"] = "sort";
				sortObj["state-name"] = query.sort;
				sortQ["operator-state"].push(sortObj);
				sQuery.query["and-query"].queries.push(sortQ);
			}
			
			return sQuery;
		};
		
		refreshData = function (query) {
			var	facet = "";
			
			var shadowQuery;
			
			// first, clear any existing queries
			queryRegistry.clear();
			
			runQuery(query);
			if (config.useShadows && query.noShadow !== true) { // TODO: don't run shadow queries when pagination is changing or sorting is changing
				for (facet in query.facets) {
					if (query.facets.hasOwnProperty(facet)) {
						if (!query.facets[facet].noShadow) {
							// make a fresh copy of the query for each particular shadow
							shadowQuery = {};
							$.extend(true, shadowQuery, query);
							// the datastream for a shadow is the facet being "shadowed"
							shadowQuery.datastream = facet;
							delete shadowQuery.facets[facet];
							runQuery(shadowQuery);
						}
					}
				}
			}
		};
		
		var runQuery = function (query) {
			var page,
				jqxhr,
				url,
				params;
			
			if (!query.page) {
				page = config.queryPage;
			} else {
				page = query.page;
			}
			
			params = '?format=json&view=all&options=' + config.optionsNode + "&start=" + page + "&pageLength=" + config.pageLength;
			if (config.proxy) {
				params += '&proxyPath=' + searchEndpoint;
				url = config.proxy + params;
			} else {
				url = searchEndpoint + params;
			}
			
			jqxhr = $.ajax({
				url: url,
				type: "POST",
				data: JSON.stringify(toSQuery(query)),
				contentType: "application/json",
				dataType: "json",
				success: function (resp) {
				    if (resp.error) {
				        $(config.appWrapper).trigger('error', resp.error.message);
				    } else {
				        $(config.widgetClass).trigger('newData', {data: resp, query: query});
				    }
				}
			});
			
			queryRegistry.register(jqxhr);
		};
		
		getData = function (query) { // supports initial loading of data without accessing widgets directly
			refreshData(query);
			oldQuery = query;
		};
		
		updateQuery = function (queryUpdate) {
			var newQuery = {},
				pushHistory = false;
			$.extend(true, newQuery, oldQuery);
			
			// don't cast shadow queries when changing the current page or results sorting
			if ((queryUpdate.page && queryUpdate.page !== newQuery.page) || (queryUpdate.sort && queryUpdate.sort !== newQuery.sort	&& !queryUpdate.facet)) {
				newQuery.noShadow = true;
				if (!queryUpdate.facet && !queryUpdate.text) {
					newQuery.resultsOnly = true;
				} else {
					delete newQuery.resultsOnly;
				}
			} else {
				delete newQuery.noShadow;
				delete newQuery.resultsOnly;
			}
			
			// merge the updated facet into the query
			if (queryUpdate.facet) {
				newQuery.page = 1; // reset to page 1 when changing facets
				
				if (!newQuery.facets) {
					newQuery.facets = {};
				}
				newQuery.facets[queryUpdate.facet] = {};
				
				newQuery.facets[queryUpdate.facet].constraintType = queryUpdate.constraintType; // pass along constraint type for query construction
				
				if (queryUpdate.noShadow) {
					if (newQuery.facets[queryUpdate.facet].noShadow === undefined) {
						newQuery.facets[queryUpdate.facet].noShadow = true;
					}
				} else {
					newQuery.facets[queryUpdate.facet].noShadow = false;
				}
				
				if (queryUpdate.value) {
					newQuery.facets[queryUpdate.facet].value = queryUpdate.value;
				} 
				else if (queryUpdate.geo) { 
					// Note that we have setup maps (google) to call queryUpdate in widgets.js if a
					// polygon is completed. And google is setup to trigger 'selection' event on widgets
					// and pass the points. The 'selection' event calls queryUpdate in widgets.js.
					// The JSON generated by google contains a single object array of key 'geo' and 
					// this single object array contains the points. However, if queryUpdate is called 
					// directly, JSON generated would contain an object with key geo (not an array).
					// So, this is defensive programming to accomodate both scnearios
					if (queryUpdate.geo[0]) {
						newQuery.facets[queryUpdate.facet].geo = queryUpdate.geo[0];
					}
					else {
					  newQuery.facets[queryUpdate.facet].geo = queryUpdate.geo;
					}
				} else {
					delete newQuery.facets[queryUpdate.facet];
				}
			}
			
			if (queryUpdate.text !== undefined && queryUpdate.text !== oldQuery.text) {
				newQuery.page = 1; // reset to page 1 when changing search term
				newQuery.text = queryUpdate.text;
				pushHistory = true;
			}
			
			if (queryUpdate.sort !== undefined) {
				newQuery.sort = queryUpdate.sort;
			}
			
			if (queryUpdate.page && queryUpdate.page !== newQuery.page) {
				newQuery.page = queryUpdate.page;
				pushHistory = true;
			}

			if (newQuery !== oldQuery) { // performance tweak: don't redo the existing query
				if (config.enableBookmarking) {
					$(config.appWrapper).trigger('newQuery', newQuery, pushHistory);
				} else {
					getData(newQuery);
				}
				
				oldQuery = newQuery;
			}
		};
		
		getBounds = (function () {
			var bounds = {};
			return function (constraint) {
				var newBoundsObj = {constraint: constraint},
					url,
					params;
				
				if (bounds[constraint]) {
					newBoundsObj.min = bounds[constraint].min;
					newBoundsObj.max = bounds[constraint].max;
					$(config.widgetClass).trigger('newBounds', newBoundsObj);
				} else {
					params = "?format=json&view=aggregate&options=" + config.optionsNode;
					if (config.proxy) {
						config.params += '&proxyPath=' + valueEndpoint + '/' + constraint;
						url = config.proxy + params;
					} else {
						url = valueEndpoint + '/' + constraint + params;
					}
					
					$.ajax({
						url: url,
						type: "GET",
						contentType: "application/json",
						dataType: "json",
						success: function (resp) {
							var xmin = 0, xmax = 0, i;
							
							for (i = 0; i < resp["values-response"]["aggregate-result"].length; i = i + 1) {
								if (resp["values-response"]["aggregate-result"][i].name === 'min') {
									xmin = resp["values-response"]["aggregate-result"][i]["_value"];
								} else if (resp["values-response"]["aggregate-result"][i].name === 'max') {
									xmax = resp["values-response"]["aggregate-result"][i]["_value"];
								}
							}

							newBoundsObj.min = xmin;
							newBoundsObj.max = xmax;
							bounds[constraint] = {
								min: xmin,
								max: xmax
							};
							
							$(config.widgetClass).trigger('newBounds', newBoundsObj);
						}
					});
				}
			};
		}());

		getInfo = (function () {
			return function (data) {
				var uri = data.uri,
					params,
					url;
				
				params = '?trans:mode=info&trans:docid=' + uri;
				if (config.proxy) {
					params += '&proxyPath=' + '/' + config.version + '/documents';
					url = config.proxy + params;
				} else {
					url = '/' + config.version + '/documents' + params;
				}
				
				$.ajax({
					url: url,
					method:'GET',
					dataType:'html',
					data: 'uri=' + encodeURIComponent(uri),
					success: function (resp) {
						if (resp.error) {
							$(config.appWrapper).trigger('error', resp.error.message);
						} else {
	                    	var link;
							if (config.proxy) {
	                    		link = '<a href="' +
	                    			config.proxy + '?uri=' + uri + '&proxyPath=/' + config.version + '/documents' +
	                			'" target="doc">more...</a> ';
	                    	} else {
	                    		link = '<a href="/v1/documents?uri=' + encodeURIComponent(uri) + '" target="doc">more...</a> ';
	                    	}
							resp = $(resp).find('p').append(link);
							data.infowindow.setContent(resp.html());
							data.infowindow.open(data.map, data.marker);
						}
					}
				});
			};
		}());

		getBox = (function () {
				
			var boxQuery = {},
				andQuery = {};
			
			return function (queryUpdate, target) {
				var params,
				    facet,
				    type,
				    facetQ,
					url;
				
				// create bounded view query which is performed
				// with every zoom/pan operation
				
				boxQuery["custom-constraint-query"] = {};
				boxQuery["qtext"] = {};
				boxQuery["qtext"] = oldQuery.text;
				boxQuery["custom-constraint-query"]["constraint-name"] = queryUpdate.facet;
				boxQuery["custom-constraint-query"]["annotation"] = queryUpdate.annotation;
				
				boxQuery["custom-constraint-query"].box = {};
				boxQuery["custom-constraint-query"].box.south = queryUpdate.geo.box[1].sw.lat;
				boxQuery["custom-constraint-query"].box.west = queryUpdate.geo.box[1].sw.lng;
				boxQuery["custom-constraint-query"].box.north = queryUpdate.geo.box[0].ne.lat;
				boxQuery["custom-constraint-query"].box.east = queryUpdate.geo.box[0].ne.lng;
				andQuery.query = {};                    
				andQuery.query["and-query"] = {};
				andQuery.query["and-query"].queries = [];
				andQuery.query["and-query"].queries.push(boxQuery);
		
				for (facet in oldQuery.facets) {
				    facetQ={};
					type = oldQuery.facets[facet].constraintType;
					
					if (type === 'range') {
						facetQ["range-constraint-query"] = {};
						facetQ["range-constraint-query"]["constraint-name"] = facet;
						facetQ["range-constraint-query"].value = oldQuery.facets[facet].value; // should be a singleton array
					} else if (type === 'collection') {
						facetQ["collection-constraint-query"] = {};
						facetQ["collection-constraint-query"]["constraint-name"] = facet;
						facetQ["collection-constraint-query"].uri = oldQuery.facets[facet].value;
					} else if (type === 'geo' && queryUpdate.facet !== facet) {
						facetQ["custom-constraint-query"] = {};
						if(oldQuery.facets[facet].geo.poly) {
						    facetQ["custom-constraint-query"]["constraint-name"] = facet;
							facetQ["custom-constraint-query"].polygon = {};
							facetQ["custom-constraint-query"].polygon.point = oldQuery.facets[facet].geo.poly;
			             }
					}
					andQuery.query["and-query"].queries.push(facetQ);					
				}
	
				params = "?format=json&view=facets&options=" + config.optionsNode;
				if (config.proxy) {
					params += '&proxyPath=' + searchEndpoint;
					url = config.proxy + params;
				} else {
					url = searchEndpoint + params;
				}
				
				$.ajax({
					url: url,
					type: "POST",
					data: JSON.stringify(andQuery),
					contentType: "application/json",
					dataType: "json", 
					success: function (resp) {	
						if (resp.error) {
							$(config.appWrapper).trigger('error', resp.error.message);
						} else {
							$(target).trigger('getBoundedBox', {
								boundedbox:true,
								resp: resp,
								query: oldQuery
							});
						}						
					}
				});
			};
		}());

		that = {
			getData: getData,
			updateQuery: updateQuery,
			getBounds: getBounds,
			getBox: getBox,
			getInfo: getInfo
		};
		
		return that;
	}());
	// ----------------------------------------------------------------------->
	// end comm object
	
	
	
	// bookmark object
	// ----------------------------------------------------------------------->
	var bookmark = (function () {
		var delimiter = ['*_*', '*__*'];
		
		var	hashQuery = function (query) {
			var facet = '',
				hash,
				bookmarkQuery,
				facets;
			
			facets = '';
			bookmarkQuery = {};
			
			bookmarkQuery.q = query.text || "";
			
			if (query.sort) {
				bookmarkQuery.s = query.sort;
			}
			
			if (query.page && query.page !== 1) {
				bookmarkQuery.p = query.page;
			}
			
			if (query.facets) {
				for (facet in query.facets) {
					if (query.facets.hasOwnProperty(facet)) {
						if (!(query.facets[facet].geo || query.facets[facet].constraintType === 'geo')) {
							facets += facet + delimiter[0] + query.facets[facet].value[0] + delimiter[1];
						}
					}
				}
			}
			
			if (facets) {
				bookmarkQuery.f = facets.substr(0, facets.length - delimiter[1].length);
			}
			
			hash = $.param(bookmarkQuery);
			
			return hash;
		};

  
		var getUrlQuery = function () {
			var param,
				query,
				paramStrArray,
				i, j,
				l, m,
				facet = '',
				facets;
			
			paramStrArray = decodeURIComponent(window.location.search.substr(1)).split('&');
			l = paramStrArray.length;
			query = {};
			
			for (i = 0; i < l; i = i + 1) {
				param = paramStrArray[i].split('=');
				
				if (param[0] === 'q') {
					if (param[1] !== "undefined") {
						query.text = decodeURIComponent(param[1].replace(/\+/g, '%20'));
					}
				} else if (param[0] === 's') {
					query.sort = param[1];
				} else if (param[0] === 'p') {
					query.page = param[1];
				} else if (param[0] === 'f') {
					facets = param[1].split(delimiter[1]);
					m = facets.length;
					query.facets = {};
					
					for (j = 0; j < m; j = j + 1) {
						facet = decodeURIComponent(facets[j]).split(delimiter[0]);
						query.facets[facet[0]] = {};
						query.facets[facet[0]].value = [facet[1].replace(/\+/g, ' ')];
						query.facets[facet[0]].constraintType = facetTypes[facet[0]];
					}
				}
			}
				
			// apply the bookmark's selections to their respective widgets
			for (facet in query.facets) {
				if (query.facets.hasOwnProperty(facet)) {
					$(config.appWrapper).find(config.widgetClass).trigger('select', {facet: facet, value: query.facets[facet].value});
				}
			}
			
			return query;
		};
		
		var init = function () {
			var popped,
				initialURL,
				getInternetExplorerVersion = function () {
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
			
			$(config.appWrapper).on('newQuery', function (e, query, addToHistory) {
				var hash = hashQuery(query);
				
				if (history && history.pushState && history.replaceState)  {
					if (addToHistory) {
						history.pushState({}, "", '?' + hash); // new 'page' in the history
					} else {
						history.replaceState({}, "", '?' + hash); // stay on the same 'page' in the history
					}
				} else if (getInternetExplorerVersion() !== -1) {
					$(config.appWrapper).trigger('bookmarkUrl', window.location.href.split('?')[0] + '?' + hash);
				}
				
				comm.getData(query);
			});
			
			// in chrome 18, window.history doesn't have state yet, but in chrome 19, state === null
			popped = ('state' in window.history && window.history.state !== null);
			initialURL = location.href;
			$(window).on('popstate', function (e) {
				var initialPop = !popped && location.href === initialURL;
				popped = true;
				// chrome / safari / webkit triggers popstate on pageload, so we have to skip that pop to avoid double queries
				if (!initialPop) {
					getData(getUrlQuery());
				}
			});
		};
		
		return {
			init: init,
			getUrlQuery: getUrlQuery
		};
	}());
	// ----------------------------------------------------------------------->
	// end bookmark object
	
	init = function (configObj) {
		if (configObj) {
			$.extend(config, configObj);
		}
		
		if (config.enableBookmarking) {
			bookmark.init();
		} else {
			$(config.appWrapper).on('newQuery', config.widgetClass, function (e, query) {
				e.stopPropagation();
				
				comm.getData(query);
			});
		}
		
		$(config.appWrapper).on('getBounds', config.widgetClass, function (e, constraint) {
			e.stopPropagation();
			
			comm.getBounds(constraint);
		});
		
		$(config.appWrapper).on('updateQuery', config.widgetClass, function (e, queryUpdate) {
			e.stopPropagation();
			
			comm.updateQuery(queryUpdate);
		});

		$(config.appWrapper).on('getBox', config.widgetClass, function (e, queryUpdate) {
			e.stopPropagation();
			
			comm.getBox(queryUpdate, e.target);
		});

		$(config.appWrapper).on('getInfoWindow', config.widgetClass, function (e, data) {
			e.stopPropagation();
			
			comm.getInfo(data);
		});
		
		$(config.appWrapper).on('constraintType', config.widgetClass, function (e, data) {
			e.stopPropagation();
			
			facetTypes[data.facet] = data.type;
		});
	};
	
	getData = function (query) {
		comm.getData(query);
	};
	
	that = {
		init: init,
		getData: getData,
		loadData: function () {
			if (document.location.search.length === 0 || !config.enableBookmarking) {
				getData({}); // load an empty query if bookmarking is disabled or if no query is in the URL
			} else {
				getData(bookmark.getUrlQuery());
			}
		},
		getConfig: function () {
			return config;
		}
	};
	
	return that;
}());
