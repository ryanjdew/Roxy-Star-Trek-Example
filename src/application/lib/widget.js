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

ML.createWidget = function (container, renderCB, datastream, constraintType) {
	"use strict";
	
	var that,
		updateQuery,
		selected = false,
		selection = "",
		shadowBack = false;
	
	//queryUpdate = {
	//    text: "stringsearch"
	//    facet: "facetname"
	//    value: "value"
	//    constraintType: "collection"
	//    geo: [geo object]
	//}
	updateQuery = function (queryUpdate) {
		if (constraintType) {
			queryUpdate.constraintType = constraintType.split('-')[0];
		}
		container.trigger('updateQuery', queryUpdate);
	};
	
	container.on('newData', function (e, resp) {
		e.stopPropagation();
		// if widget is selected, then check the widget's datastream against the incoming one
		// if the local datastream matches the incoming one, check to be sure this isn't the selection query that just went off (shadowBack)
		// if it is, then set shadowBack false and don't render

		// Added detail: results only actions such as pagination and sorting actions are only rendered on the results widget
        // Case 1: widget unselected, no incoming datastream - render
		// Case 2: widget selected, no incoming datastream - render only if widget has no stream
		// Case 3: widget unselected incoming datastream matches widget stream shadowBack false  - render
		// Case 4: widget unselected incoming datastream matches widget stream shadowBack true  - set shadowBack false and don't render
		// Case 5: widget unselected incoming datastream doesn't match widget stream - do nothing
		// Case 6: widget selected incoming datastream matches widget stream shadowBack false - render
		// Case 7: widget selected incoming datastream matches widget stream shadowBack true - set shadowBack false and don't render
		// Case 8: widget selected incoming datastream doesn't match widget stream - do nothing
		var incomingStream = resp.query.datastream;
		if (!(resp.query.resultsOnly && datastream !== 'results')) {
			if (!incomingStream && !selected ) {
				// if the widget has no selection and the incoming data has no datastream, render the data
				renderCB.call(selection, resp.data);
			} else if (datastream === incomingStream && selected) {
				if (!shadowBack) {
					// if shadowBack is false, ie: this widget didn't just send off a query, AND if the datastream matches the incoming stream, then render
					renderCB.call(selection, resp.data);
				} else {
					// otherwise, don't render, but set shadowBack false, so that the next round renders
					shadowBack = false;
				}
			}
		}
		// else do nothing, don't render
	});
	
	
	container.on('selection', function (e, data) {
		e.stopPropagation();

		var queryUpdate = {};
			if (data.facet) {
				queryUpdate.facet = data.facet;
			}
			if (data.value) {
				queryUpdate.value = [data.value];
				selected = true;
				selection = data.value;
			} 
			else if (data.geo) {
				queryUpdate.geo = [data.geo];
				selected = true;
				selection = data.geo;
			}
			else {
				selected = false;
			}
		shadowBack = false; // don't render the results of the next query, as it's a reflection of the current shadow query
		updateQuery(queryUpdate);
	});
	
	container.on('select', function (e, data) {
		e.stopPropagation();
		
		// data can be undefined when we type a string in search box and select that
		if (data !== undefined && data.facet === datastream) {
			selected = true;
			selection = data.value;
		}
	});

	container.on('getBoundedBox', function (e, data) {
		e.stopPropagation();
		
		data.resp.results ={};
		data.resp.boundedbox = true;
		renderCB(data.resp);
	});
	
	container.on('page', function (e, data) {
		e.stopPropagation();
		
		var queryUpdate = {};
		if (data.page) {
			queryUpdate.page = data.page;
		}
		updateQuery(queryUpdate);
	});
	
	that = {
		updateQuery: updateQuery,
		getSelection: function () {
			return selection;
		}
	};
	return that;
};
