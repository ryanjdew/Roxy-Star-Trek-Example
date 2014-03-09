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
if (typeof Highcharts !== 'undefined') {

	Highcharts.theme = {
	   /* LINE/BAR/COLUMN/SLICE COLORS - only used for slices for Plex, if we add multiple data sets in future releases, these colors will work with the rendering of other sets */
	   colors: ['#395C9B', '#923532', '#7B972E', '#6A538D', '#3B83A1', '#CB7221', '#F2E200'],
	    
	   /* CHART TITLE */
	   title: {
	      style: {
	         color: '#000',
	         font: 'bold 16px "Lucida Grande", Helvetica, Arial, sans-serif'
	      }
	   },
	
	   /* CHART SUBTITLE */
	   subtitle: {
	      style: {
	         color: '#666666',
	         font: 'bold 12px "Lucida Grande", Helvetica, Arial, sans-serif'
	      }
	   },
	    
	   /* CHART X-AXIS */
	   xAxis: {
	      lineColor: '#000',
	      tickColor: '#000',
	      labels: {
	         style: {
	            color: '#000',
	            font: '11px "Lucida Grande", Helvetica, Arial, sans-serif'
	         }
	      },
	      title: {
	         style: {
	            color: '#333',
	            font: 'bold 12px "Lucida Grande", Helvetica, Arial, sans-serif'
	         }
	      }
	   },
	    
	   /* CHART Y-AXIS */
	   yAxis: {
	      minorTickInterval: 'false', /* OPTIONAL PARAMETER - SHOWS HORIZONTAL LINES in between tick values */
	      lineColor: '#000',
	      lineWidth: 1,
	      tickWidth: 1,
	      tickColor: '#000',
	      labels: {
	         style: {
	            color: '#000',
	            font: '11px "Lucida Grande", Helvetica, Arial, sans-serif'
	         }
	      },
	      title: {
	         style: {
	            color: '#333',
	            font: 'bold 12px "Lucida Grande", Helvetica, Arial, sans-serif'
	         }
	      }
	   },
	    
	   /* LINE CHART COLORS */
	   plotOptions: {
	       line: {
	           lineWidth: 3,
	           shadow: false,
	           marker: {
	                fillColor: '#fff', /* LINE POINT COLOR */
	                lineWidth: 2,
	                radius: 4,
	                symbol: 'circle', /* "circle", "square", "diamond", "triangle" and "triangle-down" */
	                lineColor: null // inherit from above defined colors
	           },
			   states: {
			       select: {
			           fillColor: '#CB7221',
			           radius: 6,
			           lineWidth: 3
			       }
			   }
	       },
	       column: {
	          cursor: 'pointer',
	          borderColor: '#333',
	          borderWidth: 1,
	          shadow: false,
			  states: {
			      select: {
			          color: '#CB7221'
			      }
			  }
	       },
	       bar: {
	          cursor: 'pointer',
	          borderColor: '#333',
	          borderWidth: 1,
	          shadow: false,
			  states: {
			      select: {
			          color: '#CB7221'
			      }
			  }
	       },
	       pie: {
	          cursor: 'pointer',
	          borderColor: '#666',
	          borderWidth: 1,
	          shadow: false,
	          size: '50%'
	       }
	   }
	    
	}; 
	if (Highcharts.setOptions !== undefined) {
		Highcharts.setOptions(Highcharts.theme);
		// work-around for HighCharts bug: https://github.com/highslide-software/highcharts.com/issues/1071 
		Highcharts.getOptions().colors = ['#395C9B', '#923532', '#7B972E', '#6A538D', '#3B83A1', '#CB7221', '#F2E200'];
	}

}