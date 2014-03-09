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

ML.createSearch = function (containerID, config) {
	config = config || {};
    
	var generateSuggestionList,
		searchBoxHTML,
		suggestionRequested,
		suggestionRequestStr,
		suggestionRequestDelay = 250,  // milliseconds
		getSuggestions,
		suggestionUp,
		suggestionDown,
		scrollSuggestionInView,
		getSelectedResourceIndex,
		suggestEndpoint = '/v1/resources/extsuggest',
		searchSuggestionsContainer,
		queryText,
		container;
		
	container = $('#' + containerID);
	
	queryText = (function () {
		var param,
			paramStrArray,
			i,
			l,
			q = '';
		
		paramStrArray = window.location.search.substr(1).split('&');
		l = paramStrArray.length;
		
		for (i = 0; i < l; i = i + 1) {
			param = paramStrArray[i].split('=');
			if (param[0] === 'q') {
				q = decodeURIComponent(param[1].replace(/\+/g, '%20'));
				break;
			}
		}
		return q;
    }());
    
	searchBoxHTML = '<form name="query" id="query">'
		+ '<input type="text" id="query-text" value="" autocomplete="off" />'
		+ '<button type="submit" class="button" id="update-query">Search</button>'
		+ '</form>'
		+ '<div id="search-suggestions"></div>';
    
	container.html(searchBoxHTML);
	$('#query-text').val(queryText);
	searchSuggestionsContainer = $("#search-suggestions");
	
	var widget = ML.createWidget(container, function () {});
	
    container.find('#query').submit(function (e) {
        e.preventDefault();
        if(searchSuggestionsContainer.find("li.selected").length > 0) {
        	$("#query-text").val(searchSuggestionsContainer.find("li.selected").text());
        } 
        widget.updateQuery({
            text: $('#query-text').val()
        });
        searchSuggestionsContainer.removeClass('display');
        return false;
    });
	
	/***************************/
    /** search functionality  **/
    /***************************/
	generateSuggestionList = function(suggestions) {		
		// conditional handling for more intuitive UI - 
		// if only one item is returned and it's the same as the query text, don't show suggestion		
        searchSuggestionsContainer.html('<ul></ul>');  // clears list, before setting it again
        if (suggestions.length == 1 && suggestions[0] == $("#query-text").val()) {
        	
        } else if (suggestions.length > 0) {
    		var suggestionHTML = '';
	        for (var i=0, length = suggestions.length; i < length; i++) {
	            suggestionHTML += '<li>' + suggestions[i] + '</li>';
	        }	  
	        searchSuggestionsContainer.find("ul").html(suggestionHTML);
	        searchSuggestionsContainer.addClass('display');
	    }
	};
		
	getSuggestions = function(text) {    
		if (!suggestionRequested) {
			suggestionRequested = true;
			suggestionRequestStr = text;
			$.ajax({
	            type: 'GET',
	            url: suggestEndpoint + '?rs:pqtxt=' + window.encodeURI(text),
	            dataType: 'json',
	            contentType: "application/json",
	            success:function(data, textStatus, XMLHttpRequest){
	            	generateSuggestionList(data.suggestions);
	            	setTimeout(function() { 
	            		suggestionRequested = false;
	            		if ((suggestionRequestStr !== container.find('#query-text').val()) && (container.find('#query-text').val() !== ''))
	            			getSuggestions(container.find('#query-text').val());
	            	}, suggestionRequestDelay);
	            },
	            // Override default error handling (ajaxSetup() in controller.js), just quietly write to console
	            error:function(jqXHR, textStatus, errorThrown){
	            	if (console && console.error) {
	    			    console.error('getSuggestions(): ' + jqXHR.statusText);
	    			}
	            }
	         });
		}
    };
    
    suggestionDown = function() {
        var suggestions = searchSuggestionsContainer.find("li");
        if (searchSuggestionsContainer.find("li.selected").length > 0) {
            var currentIndex = getSelectedResourceIndex();
            searchSuggestionsContainer.find("li.selected").removeClass('selected');  // remove currently selected
            if (currentIndex == (suggestions.length - 1))
                $(suggestions[0]).addClass('selected');
            else $(suggestions[currentIndex + 1]).addClass('selected');
            scrollSuggestionInView();
        } else {
            // nothing selected yet            
            $(suggestions[0]).addClass('selected');
        }
    };
    
    suggestionUp = function() {
        var suggestions = searchSuggestionsContainer.find("li");
        if (searchSuggestionsContainer.find("li.selected").length > 0) {
            var currentIndex = getSelectedResourceIndex();
            searchSuggestionsContainer.find("li.selected").removeClass('selected');  // remove currently selected
            if (currentIndex == 0)
                $(suggestions[suggestions.length - 1]).addClass('selected');
            else $(suggestions[currentIndex - 1]).addClass('selected');
            scrollSuggestionInView();
        } else {
            // nothing selected yet            
            $(suggestions[suggestions.length - 1]).addClass('selected');
        }
    };
    
    scrollSuggestionInView = function() {
        var suggestions = searchSuggestionsContainer.find("li");
        var currentScrollHeight = searchSuggestionsContainer.scrollTop();
        var suggestionOffset =  searchSuggestionsContainer.offset().top;
        if (searchSuggestionsContainer.find("li.selected").length > 0) {
            if ((searchSuggestionsContainer.find("li.selected").offset().top + suggestionOffset) > searchSuggestionsContainer.outerHeight()) {  
                var targetOffset = (searchSuggestionsContainer.find("li.selected").offset().top - searchSuggestionsContainer.outerHeight()) + currentScrollHeight;
                searchSuggestionsContainer.animate({scrollTop: targetOffset}, 200, function() {});
            } else {
                if ((searchSuggestionsContainer.find("li.selected").offset().top + suggestionOffset) <= 0) { 
                    searchSuggestionsContainer.animate({scrollTop: 0}, 200, function() {});
                }                    
            }
        }
    };
    
    getSelectedResourceIndex = function() {
        var current;
        searchSuggestionsContainer.find("li").each(function(index){
            if ($(this).hasClass('selected'))
                current = index;
        });
        return current;
    };
    
    /* INTERACTIONS */    
    container.find('#query-text').focus(function() {
    	if (($("#query-text").val() !== '') && (searchSuggestionsContainer.find("ul li").length > 0)) {
    		searchSuggestionsContainer.addClass('display'); 
    	}
    });
    container.find('#query-text').blur(function() {
        setTimeout(function() {
            searchSuggestionsContainer.removeClass('display');
            searchSuggestionsContainer.find("li").removeClass('selected');
        },500);        
    });
    
    container.find('#query-text').keyup(function(e) {
        if (e.keyCode == "13") { // enter key was pressed        	
            if (searchSuggestionsContainer.find("li.selected").length > 0) {
    			searchSuggestionsContainer.removeClass('display');
                getSuggestions( $("#query-text").val() );
            } 
        } else if (e.keyCode == "40") { // arrow down
            suggestionDown();
        } else if (e.keyCode == "38") { // arrow up
            suggestionUp();
        } else {
        	if ($("#query-text").val() !== '' && ((e.keyCode !== "37") || (e.keyCode !== "39")))  // ignore left and right
            	getSuggestions( $("#query-text").val() );
            else {
            	searchSuggestionsContainer.removeClass('display');            
            }
        }
    });    

    searchSuggestionsContainer.delegate("li", "click", function (e) {
    	$("#query-text").val($(this).text());
    	container.find('#query').submit();
    }); 
    
    searchSuggestionsContainer.delegate("li", "hover", function(e){	
        if ((e.type == 'mouseover') || (e.type == 'mouseenter')) {
           searchSuggestionsContainer.find("li").each(function() {
               $(this).removeClass("selected");
           });
           $(this).addClass("selected");
        }                
    });     
	
};
