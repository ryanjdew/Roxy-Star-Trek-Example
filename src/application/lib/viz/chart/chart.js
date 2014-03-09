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

// chart supports line | bar | column | pie for type
// config object for a chart
//config = {
//	constraint: 'decade'
//	constraintType: 'range | constraint | geo',
//	title: "Lorem Ipsum",
//	subtitle "Lorem Ipsum Dolores Sit Amet",
//	dataLabel: "Lorem",
//	dataType: "string" | "datetime" | etc
//	includeOthers: true | false,
//	othersLabel: "string"
//	hideXAxisValues: true | false
//	highchartsTheme: highcharts configuration object
//}
ML.chartWidget = function (containerID, type, config) {
	'use strict';
		// returned object
	var that,
		
		// private properties
		chart,
		constraint,
		container,
		widget,
		chartOptions,
		dataType,
		passedConstraintType,
		selection,
		isNumeric,
		isDate,
		fixedTimeDayMonthAxis,
		first,
		
		// arrays of data types used for identification
		numericDataTypes,			
		dateDataTypes,
		
		// private methods
		getTickInterval,
		formatTimeText,
		dateToText,
		convertDateToUTC,
		parseDurationString,
		parseDataType,
		setChartBounds,
		renderCB;
	
	// initialize private variables
	that = null; // returned for debugging
	first = true;
	config = config || {}; // initialize blank to prevent error from accessing property of undefined
	container = $('#' + containerID); 
	constraint = config.constraint;
	dataType = config.dataType || "string"; // default to a string dataType
	passedConstraintType = config.constraintType;  // used for 
	selection = null; // start out with no selection
	isNumeric = false;
	isDate = false;
	fixedTimeDayMonthAxis = false;  // set to true if you want fixed axis labels for time/month/day
	// unParsedXVal = null;
	chart = null;
	
	// containerID must exist on the page
	if (container.length === 0) {
		throw('Chart widget container ID "' + containerID + '" does not exist');
	}
	
	config.constraintType = config.constraintType.split('-')[0];
	container.trigger('constraintType', {facet: config.constraint, type: config.constraintType});
	
	/**** data type parsing ****/
	numericDataTypes = ["integer","decimal","double","float","int","long","short","unsignedInt","unsignedLong"];			
	dateDataTypes = ["year","gYear","gMonth","gDay","gMonthDay","gYearMonth","date","time","dateTime"];  // ,"duration","yearMonthDuration" not supported in Plex

	convertDateToUTC = function(dateToConvert) { 
		var timeZoneOffsetMs = dateToConvert.getTimezoneOffset() * 60 * 1000, // milliseconds offset from GMT/UTC
			convertedDate = Date.UTC(dateToConvert.getUTCFullYear(), dateToConvert.getUTCMonth(), dateToConvert.getUTCDate(), dateToConvert.getUTCHours(), dateToConvert.getUTCMinutes(), dateToConvert.getUTCSeconds());
		
		convertedDate = convertedDate - timeZoneOffsetMs;
		return convertedDate;
	};
	
	parseDurationString = function (val,delimeter) {
		var parsedStr,  
		    delimitedStr = val.split(delimeter);
		
		if (delimitedStr.length > 1) {
			parsedStr = delimitedStr[0];
		} 
		
		return parsedStr;		
	};
	
	// parse and unparse values according to the datatype. ie date, time, year, month, etc.
	parseDataType = function (val) {
		var parsedVal, dateObj, dateFragments, durationFragments = {};
		parsedVal = (isNumeric) ?  parseFloat(val) : parsedVal;
		if (!parsedVal && val) { // then its not numeric, so we're parsing a date	
			dateObj = new Date(); // sets to today's date
			dateObj.setHours(0);  
			dateObj.setMinutes(0);
			dateObj.setSeconds(0);
			
			switch(dataType)
			{
				case "gYear":
					// MarkLogic default format: '2011'
					// set to first day, month of current year, renders point ON tick mark
					dateObj.setDate(1);
					// set to first month of year, renders point ON tick mark
					dateObj.setMonth(0);  // valid values 0 - 11
					dateObj.setFullYear(val);
					parsedVal = convertDateToUTC(dateObj);
					break;
				case "gMonth":
					// MarkLogic default format: '--11' or '--01'
					// set to first day of current year, renders point ON tick mark
					dateObj.setDate(1);
					// using Number instead of parseInt as Number("08") = 8, where parseInt("08") = 0
					dateObj.setMonth(Number(val.replace(/[\-]/g, "")) - 1);  // valid month values 0 - 11  
					parsedVal = convertDateToUTC(dateObj);
					break;
				case "gDay":
					// MarkLogic default format: '---11'
					dateObj.setMonth(0);  // valid values 0 - 11	
					dateObj.setDate(val.replace(/[\-]/g, ""));  // setDate sets the day of the month object
					parsedVal = convertDateToUTC(dateObj);
					break;
				case "date":
					// MarkLogic default format: '2012-06-12'
					// Safari and IE don't accept this format, change '-' to '/'
					val = val.replace(/[\-]/g, "/");
					dateObj = new Date(val);              
					dateObj.setHours(0);
					dateObj.setMinutes(0);
					dateObj.setSeconds(0);
					parsedVal = convertDateToUTC(dateObj);
					break;
				case "time":
					// MarkLogic default format: '13:29:20.979596'
					dateFragments = val.split('.');
					dateFragments = dateFragments[0].split(':');
					dateObj.setHours(dateFragments[0]);
					dateObj.setMinutes(dateFragments[1]);
					dateObj.setSeconds(dateFragments[2]);
					parsedVal = convertDateToUTC(dateObj);
					break;
				case "dateTime":
					// format: '2012-06-25T01:01:01'
					// Safari and IE don't accept this format, change '-' to '/', also Safari doesn't accept 'T'
					dateFragments = val.split('.'); // remove milliseconds
					val = dateFragments[0];  
					val = val.replace(/[\-]/g, "/");
					val = val.replace("T", " ");
					dateObj = new Date(val); // handled by Date   			
					parsedVal = convertDateToUTC(dateObj);
					break;
				case "gYearMonth":
					// format: '2012-06'
					dateFragments = val.split('-');
					dateObj = new Date(dateFragments[0], dateFragments[1], 1); // year, month, day
					dateObj.setHours(0);  
					dateObj.setMinutes(0);
					dateObj.setSeconds(0);
					parsedVal = convertDateToUTC(dateObj);
					break;
				case "yearMonthDuration":					
				case "dayTimeDuration":
					// punting on duration conversion - many layers of complexity involved, not in Plex
					parsedVal = val;
					/*
					dateFragments = val.split('T'); // sample format 'P1DT6H3M5.6S'
					dateFragments[0].replace('P','');   // remove 'P'
					if (dateFragments.length > 1) { // then a time/duration exists, break out '6H3M5.6S'
						durationFragments.hour = parseDurationString(dateFragments[1],'H');
						durationFragments.minute = parseDurationString(dateFragments[1],'M');
						durationFragments.second = parseDurationString(dateFragments[1],'S');
					}
					*/
					break;					
				default:
					break;
			}
		}		
		return parsedVal;
	};

	// utility function adding a zero to single digit time
	formatTimeText = function (dateStr) {
		return (parseInt(dateStr) < 10) ? '0' + dateStr : dateStr;
	};
	
	dateToText = function (parsedDateVal) {
		var dateObj, 
			timeZoneOffsetinHours,
			dateTxt = parsedDateVal, 
			monthNames = [ "January", "February", "March", "April", "May", "June",
		                 "July", "August", "September", "October", "November", "December" ];
		if (isDate) {	
			dateObj = new Date(parsedDateVal);
			parsedDateVal = parsedDateVal + (dateObj.getTimezoneOffset() * 60 * 1000); // put ms offset back on to parsed GMT/UTC value
			dateObj = new Date(parsedDateVal);  // recreate Date from newly timezone specific GMT time

			// since we stored the value as GMT, restore to current timezone for proper viewing on the client
			switch(dataType)
			{
				case "gYear":
					// tooltip format: '2011'
					dateTxt = dateObj.getFullYear();
					break;
				case "gMonth":
					// tooltip format: 'March'
					dateTxt = monthNames[dateObj.getMonth()];
					break;
				case "gDay":
					// tooltip format: '20' or '1'
					dateTxt = dateObj.getDate(); 
					break;
				case "date":
					// tooltip format: '3/20/2012'   
					dateTxt = (dateObj.getMonth() + 1) + '/' + dateObj.getDate() + '/' + dateObj.getFullYear();
					break;
				case "time":
					// tooltip format: '13:29:20'
					dateTxt = formatTimeText(dateObj.getHours()) + ':' + formatTimeText(dateObj.getMinutes()) + ':' + formatTimeText(dateObj.getSeconds());
					break;
				case "dateTime":
					// tooltip format: '3/20/2012 13:29:20'
					dateTxt = (dateObj.getMonth() + 1)+ '/' + dateObj.getDate() + '/' + dateObj.getFullYear() + ' ' + formatTimeText(dateObj.getHours()) + ':' + formatTimeText(dateObj.getMinutes()) + ':' + formatTimeText(dateObj.getSeconds());
					break;
				case "gYearMonth":
					// tooltip format: 'March 2012'
					dateTxt = monthNames[dateObj.getMonth()] + ' ' + dateObj.getFullYear();
					break;
				default:
					break;
			}			
		} 

		return dateTxt;
	};	
	
	// set bounds for chart, either from server vals or from extremes related to date dataType
	setChartBounds = function () {
		var dateMinObj, dateMaxObj, timeZoneOffsetinHours;
		// the only case where we set bounds for the chart via server data is for numeric or gYear,gYearMonth,date,dateTime based line charts 
		if ((isNumeric || (isDate && ($.inArray(dataType,['gYear','gYearMonth','date','dateTime']) !== -1))) && type === 'line') {
			container.trigger('getBounds', constraint);
		// custom bounds rendering on charts for gMonth, gDay & time - otherwise, let data set bounds
		} else if (isDate && fixedTimeDayMonthAxis && ($.inArray(dataType,['gMonth','gDay','time']) !== -1)) {	
			dateMinObj = new Date();
			dateMaxObj = new Date();
			switch(dataType)
			{
				case "gMonth":
					dateMinObj.setDate(1);
					dateMinObj.setMonth(0);  
					dateMinObj.setHours(0);  
					dateMinObj.setMinutes(0);
					dateMinObj.setSeconds(0);
					
					dateMaxObj.setDate(31);
					dateMaxObj.setMonth(11);
					dateMaxObj.setHours(23);
					dateMaxObj.setMinutes(59);
					dateMaxObj.setSeconds(59);
					break;
				case "gDay":
					dateMinObj.setDate(1);
					dateMinObj.setMonth(0);
					dateMinObj.setHours(0);  
					dateMinObj.setMinutes(0);
					dateMinObj.setSeconds(0);
					
					dateMaxObj.setDate(31);
					dateMaxObj.setMonth(0);  
					dateMaxObj.setHours(23);
					dateMaxObj.setMinutes(59);
					dateMaxObj.setSeconds(59);
					break;
				case "time":
					dateMinObj.setHours(0);
					dateMinObj.setMinutes(0);
					dateMinObj.setSeconds(0);
					
					dateMaxObj.setHours(23);
					dateMaxObj.setMinutes(59);
					dateMaxObj.setSeconds(59);
					break;
				default:
					break;
			}
			dateMinObj = convertDateToUTC(dateMinObj);
			dateMaxObj = convertDateToUTC(dateMaxObj);
			
			if (chart) {
				chart.xAxis[0].setExtremes(dateMinObj, dateMaxObj);
			} else {
				chartOptions.xAxis.min = dateMinObj;
				chartOptions.xAxis.max = dateMaxObj;
			}			
		}

	};	
	
	// custom setting of tick interval for better rendering of data for datetimes
	getTickInterval = function () {
		var tickInterval = null;  // defaults to null, allow HC to handle tick rendering
		// custom rendering of ticks for gMonth, gDay, time
		if (isDate && ($.inArray(dataType,['gMonth','gDay','time']) !== -1)) {	
			switch(dataType)
			{
				case "gMonth":
					tickInterval = 1000 * 60 * 60 * 24 * 31 * 2;  // every other month
					break;
				case "gDay":
					tickInterval = 1000 * 60 * 60 * 24 * 2;  // every other day
					break;
				case "time":
					tickInterval = 1000 * 60 * 240;  // every 4 hours
					break;
				default:
					break;
			}	
		}
		
		return tickInterval;
	};	
	
	// if dataType is namespaced, drop the namespace, otherwise just return it
	dataType = dataType.split(':');
	if (dataType.length > 1) {
		dataType = dataType[1];
	} else {
		dataType = dataType[0];
	}
	
	// get a proper list of different data types supported by the server
	isNumeric = ($.inArray(dataType,numericDataTypes) !== -1) ? true : false;
	// cannot parse bucketed date types as the values returned for these buckets can be set to anything
	isDate = (($.inArray(dataType,dateDataTypes) !== -1) && (passedConstraintType !== 'range-bucketed')) ? true : false;
	
	// universal chart setup options
	chartOptions = {
		chart: {
			type: type,
			renderTo: containerID,
			backgroundColor: '',
			marginRight: 20,
			animation: false
		},
		title: {
			text: config.title || ''
		},
		subtitle: {
			text: config.subtitle || ''
		},
		legend: {
			enabled: false
		},
		credits: {
			enabled: false
		},
        xAxis: {
			minPadding: 0.05,
			maxPadding: 0.05,
			tickInterval: getTickInterval(),
			labels:{
                enabled:true
            },
            title: {
                text: config.dataLabel || ''
            }
        },
        yAxis: {
        	allowDecimals: false, // count 
            title: {
                text: config.measureLabel || ''
            }
        },        
        tooltip: {
            useHTML: true,
            formatter: function () {
                var dataVal, 
                	measureTxt, 
                	tooltipHTML, 
                	dataTxt = config.dataLabel || config.constraint;
                	if (isDate) { // date
                		dataVal = dateToText(this.point.x);
                	} else if (isNumeric) { // number
                		dataVal = this.point.x;
                	} else { // string                		
                		dataVal = this.point.name;
                	}
                	measureTxt = config.measureLabel || 'count'; 	// no label, defaults to constraint name
                	tooltipHTML = '<span><strong>' + dataTxt + ':</strong> ' + dataVal +
                                  '<br /><strong>' + measureTxt + ':</strong> ' + this.y + '</span>';
                return tooltipHTML;
            }
        }
	};
	
	// set bounds on the charts
	setChartBounds();	
	
	/* set date axis labeling options for date based series */
	if (isDate) {
		chartOptions.xAxis.type = 'datetime';
		chartOptions.xAxis.dateTimeLabelFormats = {
	    	second: '%H:%M:%S',
	        minute: '%H:%M',
	        hour: '%H:%M',
	        day: '%e',
	        week: '%e',
	        month: '%b',
	        year: '%Y'
	    };
		// HighCharts likes to display a tick at the end that is of the next day
		// so we suppress the final tick mark to avoid confusion
		if (dataType == 'time') {
			chartOptions.xAxis.showLastLabel = false;
		}
	}

	container.on('newBounds', (function () {
		return function (e, bounds) {
			var boundsMin = bounds.min, 
				boundsMax = bounds.max;
			if ( (bounds.constraint === constraint) && (type === 'line') ) {
				if (isNumeric || (isDate && ($.inArray(dataType,['gYear','gYearMonth','date','dateTime']) !== -1))) {
					boundsMin = parseDataType(bounds.min);
					boundsMax = parseDataType(bounds.max);			
					if (chart) {
						chart.xAxis[0].setExtremes(boundsMin, boundsMax);
					} else {
						chartOptions.xAxis.min = boundsMin;
						chartOptions.xAxis.max = boundsMax;
					}
				}
			}
		};
	}()));
	
	// listener for selections from bookmark url string
	container.on('select', function (e, data) {
		if (data.facet === config.constraint) {
			selection = data.value[0];
		}
	});
	
	// If the values have to be displayed on the x-axis, inform highcharts to show them
	// This applies to line, bar and column charts only
	if ((type === 'pie') || (config.hideXAxisValues === true)) {
	  chartOptions.xAxis.labels.enabled = false;
	} else if (type !== 'line' && type !== 'bar' && type !== 'column') {
	    throw('ERROR: Unsupported chart type: ' + type);
	}
	
	chartOptions.chart.events = {
		click: function (event) {
			var selectedPoints = this.getSelectedPoints(),
				l = selectedPoints.length,
				i;
			
			if (selection) { // only unselect if there is a current selection
				container.trigger('selection', {facet: config.constraint});
				selection = null;
				
				for (i = 0; i < l; i = i + 1) {
					selectedPoints[i].select(false);
				}
			}
		}
	};
	
	chartOptions.plotOptions = {};
	chartOptions.plotOptions[type] = {
		cursor: 'pointer',
		dataLabels: {
			enabled: false
		},
		point: {
			events: {
				click: function (e) {
					var pointVal;
				    // disable select if chart type is line and if "other" label is clicked
					if (type !== 'line' && (this.name || this.category) !== config.othersLabel) {
						this.select(!this.selected, false);
						if (this.selected) {
							// new selection so hide widget's offscreen messaging
							$('#'+containerID+' .offscreen-control').hide();
							$('#'+containerID+' .offscreen-content').hide();
							
							pointVal = (isNumeric || isDate) ? this.unParsedXVal : this.name;
							container.trigger('selection', {
								value: pointVal,
								facet: config.constraint
							});
							selection = pointVal;
						} else {
							container.trigger('selection', {
								facet: config.constraint
							});
							selection = null;
						}
					}
				}
			}
		}
	};
	
	var offscreenContent;
	var offscreenControl;
		
    // special options for pie charts
    if (type === 'pie') {
        chartOptions.plotOptions[type].dataLabels.enabled = true;
        chartOptions.plotOptions[type].showInLegend = true;
    }

    if (!isNumeric && !isDate) {
		chartOptions.xAxis.categories = [];
	}
    
    if (config.highchartsTheme) {
    	chartOptions = $.extend(true, {}, config.highchartsTheme, chartOptions);
    }	
    
	chart = new Highcharts.Chart(chartOptions);
	
	// show loading screen
    if ($.browser.msie !== true && $.browser.version !== '8.0')
        chart.showLoading();
	
	// this function is called whenever the chart receives data.
	renderCB = function (data) {
		if(!data.boundedbox){			

		var facetData,
			vals,
			cats,
			i,
			len,
			xVal,
			valObj,
			unParsedXVal,
			selectionIndex,
			selectionLabel,
			facetSum,
			offscreenContent,
			offscreenControl;
		
		vals = [];
		cats = [];
		
		// config.constraint must exist in result facets
		if (data.facets[config.constraint] === null || data.facets[config.constraint] === undefined) {
			throw('ERROR: Widget constraint does not exist: ' + config.constraint);
		} else {
			facetData = data.facets[config.constraint].facetValues;			
		}
		
		selectionIndex = null; // stores the array index position of the selected element
		facetSum = 0; // if including an other category, this is the sum of all returned facets
		
		if (data.facets[config.constraint].facetValues.length > 0) {
		  if(data.facets[config.constraint].type){
			dataType = data.facets[config.constraint].type.split(':')[1];
		  }else{
	        dataType="string";
		  }
		}
		
		// assemble highcharts data object
		for (i = 0, len = facetData.length; i < len; i = i + 1) {
			unParsedXVal = null,
			xVal = facetData[i].name;
			if (isNumeric || isDate) { // if numeric or date, we need to parse the x variable into a graphable number
				unParsedXVal = xVal;
				xVal = parseDataType(xVal); 
				valObj = { x: xVal, y: facetData[i].count, unParsedXVal: unParsedXVal };
				// pie charts need a name value to render slices properly
				if (isDate && (type === 'pie')) {
					valObj.name = dateToText(xVal)
				} else if (isNumeric && (type === 'pie')) {
					valObj.name = xVal
				}
				vals.push(valObj); // fill values array with counts
				// if the selection is in the current results, record it's index position, i
				if (selection === unParsedXVal) {
					selectionIndex = i;
				}
			} else { // if not numeric or date, we fil a categories array with string labels for each point
				cats.push(xVal);

				// if the selection is in the current results, record it's index position, i
				if (selection === xVal) {
					selectionIndex = i;
				}

				if (config.includeOther) {
					facetSum += facetData[i].count;
				}
				vals.push([xVal, facetData[i].count]); // fill values array with counts
			}
					    
		    /*  If chart has a selection, selection will not be null
		     *  If chart has a selection and selection is display, at some point in loop selection will === xVal
		     *  So, if selection !== null, and selection never === xVal, we need to display notice.
		     */
		}
		
		if (config.includeOthers) {
			vals.push({ name:config.othersLabel, x:config.othersLabel, y:(data.total - facetSum)}); // fill values array with counts
			cats.push(config.othersLabel);
		}

		if (!isNumeric && !isDate) {
			chart.xAxis[0].setCategories(cats); // sets new category labels
		}

		if (first) {
			first = false;
			chart.addSeries({name: config.dataLabel, data: vals});
		} else {
			chart.series[0].setData(vals); // redraws the graphed data
		}
  
		if (selectionIndex !== null) { // reselect the previously selected value, which was cleared by setData()
			chart.series[0].data[selectionIndex].select(true, false); // highcharts undocumented: point.select([selectionStateBoolean], [addToSelectionBoolean])
		}
		
		// Display offscreen messaging if selection exists but selectionIndex never defined (so selection not on visible chart)
		
		// create container for offscreen messaging
		
		if (!offscreenContent || !offscreenControl) {
			container.find('.highcharts-container').append(
					'<div class="offscreen">'
					+ '<div class="offscreen-control">'
					+ '<a href="javascript:;" class="button-delete" title="clear selection"></a><a href="javascript:;" class="tipdown" title="selection info"></a>'
					+ '</div>'
					+ '<div class="offscreen-content" style="display:none;"></div>'
					+ '</div>'
			);
			
		    // Handle offscreen-control show/hide
		    container.find('.offscreen').on('click', function (e) {
		    	e.stopPropagation();  // prevents click from bubbling up to chart, which could cause deselection
		        // tipdown selected
				if ($(e.target).hasClass('tipdown')) {
				      $(this).find('.offscreen-content').toggle();
				      $(e.target).toggleClass('open');
				}
				
				// Handle offscreen-control deselect
				if ($(e.target).hasClass('button-delete')) {
				      container.trigger('selection', { facet: config.constraint });
			          selection = null;
				}
		    });
		}
		
		offscreenContent = container.find('.highcharts-container .offscreen-content');
		offscreenControl = container.find('.highcharts-container .offscreen-control');
		
		offscreenContent.hide();
		offscreenControl.hide();
		$('#'+containerID+' .offscreen .tipdown').removeClass('open');
		if (selection !== null && selectionIndex === null) {
			selectionLabel = (isDate) ? dateToText(parseDataType(selection)) : selection;
			offscreenContent.html(
					'<div class="offscreen-arrow"></div>'
				  + '<div class="right">Selected:</div>'
				  + '<div class="left">' + selectionLabel + '</div>'
			);
			offscreenControl.show();
		}
		
		chart.hideLoading();
		}
	};
	
	// instantiate widget
	widget = ML.createWidget(container, renderCB, config.constraint, config.constraintType);
    
    // temp debugging code
	if (ML.DEBUG) {
		that = {
			privateVariables: function () {
				return { 
                    chart: chart,
                    containerID: containerID,
                    container: container,
                    constraint: constraint,
                    type: type,
                    config: config
                };
			}
		};
	}
	return that;
};
