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
	   colors: ['#A1CE93', '#B280FF', '#80DAFF', '#FFBC80', '#FFF780', '#80A7FF', '#FF8380'],
	    
	   /* CHART TITLE */
	   title: {
	      style: {
	         color: '#000',
	         font: 'bold 16px Georgia, Palatino, "Times New Roman", serif'
	      }
	   },
	
	   /* CHART SUBTITLE */
	   subtitle: {
	      style: {
	         color: '#666666',
	         font: 'bold 12px Georgia, Palatino, "Times New Roman", serif'
	      }
	   },
	    
	   /* CHART X-AXIS */
	   xAxis: {
	      lineColor: '#000',
	      tickColor: '#000',
	      labels: {
	         style: {
	            color: '#000',
	            font: '11px Georgia, Palatino, "Times New Roman", serif'
	         }
	      },
	      title: {
	         style: {
	            color: '#333',
	            font: 'bold 12px Georgia, Palatino, "Times New Roman", serif'
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
	            font: '11px Georgia, Palatino, "Times New Roman", serif'
	         }
	      },
	      title: {
	         style: {
	            color: '#333',
	            font: 'bold 12px Georgia, Palatino, "Times New Roman", serif'
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
			           fillColor: '#FFBC80',
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
			          color: '#FFBC80'
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
			          color: '#FFBC80'
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
		Highcharts.getOptions().colors = ['#A1CE93', '#B280FF', '#80DAFF', '#FFBC80', '#FFF780', '#80A7FF', '#FF8380'];
	}

}