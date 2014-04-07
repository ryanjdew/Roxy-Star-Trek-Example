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

ML.createResults = function (containerID, config) {
    config = config || {
        
    };
    
    // private properties
    var container,
        widget,
        html,
        containerFailTxt,
        
        // sorting
        sortMenu,
        sortLabel,
        currentSort,
        classSort,
        defaultLabel,
        
        // pagination
        resultStart,
        resultLength,
        resultEnd,
        resultTotal,
        pageCurr,
        pageTotal,
        prevStart,
        prevLink,
        nextStart,
        nextLink,
        
        // results
        content,
        meta,
        titleContent,
        abstractTitle,
        longSnippet,
        shortSnippet,
        snippetLength,
        snippetStatus,
        metaContent,
        abstractMetadata,
        shortDisplay,
        longDisplay,
        className,
        
        // private methods
        truncStr,
        getMeta,
        wrapArray,
        renderCB;
    
    // initialize properties
    container = $('#' + containerID);
    html = '';
    currentSort = '';
    defaultLabel = 'Default';
    container.html(html);    
    snippetStatus = 'long';
    containerFailTxt = 'results.js: parameter "containerID" has not been set properly';
    
    // Encode HTML tags
    encodeTags = function (str) {
        return str.replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    
    // Truncate a string to a char length limit
    truncStr = function (str, len) {
        if (str.length > len) {
            var trunc = str.substr(0, len);
            var truncArr = trunc.split(" ");
            truncArr.splice((truncArr.length-1), 1);
            str = truncArr.join(" ") + '...';		
        }
        return str;
    };
    
    // For array of metadata objects, get the value corresponding to a key
    getMeta = function (key, data) {
        var result = '';
        for (var m in data) {
            if (data[m][key] !== undefined) {
                result = data[m][key];
            }
        }
        return result;
    };
    
    // Ensure object is in array form
    wrapArray = function (obj) {
        if($.isArray(obj))
          return obj;
        else
          return [obj];
    };
    
    renderCB = function (data) {
    if(!data.boundedbox){			
        /******************/
        /* Results header */  
        /******************/
        sortMenu = '';
        sortLabel = '';
        // Create sort menu only if sorts are defined, otherwise leave empty
        if (config.metadata.sort && !$.isEmptyObject(config.metadata.sort)) {
            // Menu label and default menu item
            sortMenu = 'Sort <a href="javascript:;" class="tipdown" title="tip"></a>' +
                       '</div>' +
                       '<ul id="sort-list">' +
                       '<li class="default"><a href="javascript:;" rel="">' + defaultLabel + '</a></li>';   		    		
            // List of defined sorts
            for (var s in config.metadata.sort) {
                // label could be an object ("label":{"lang":"en", "_value":"SortLabel"}) or just a property ("label":"SortLabel")
                if (config.metadata.sort[s].label['_value'] !== undefined) {
                    sortLabel = config.metadata.sort[s].label['_value'];
                } else {
                    sortLabel = config.metadata.sort[s].label;
                }
                sortMenu += '<li><a href="javascript:;" rel="' + s + '">' + sortLabel + '</a></li>';
            }
            sortMenu += '</ul>';    		    		
        }
        container.html(
                '<div id="results-header">'
                + '<div id="snippet-nav">'
                + '<div class="snippet-button"><a href="javascript:;" id="snippet-short" title="short snippets"></a></div>'
                + '<div class="snippet-button selected"><a href="javascript:;" id="snippet-long" title="long snippets"></a></div>'
                + '</div>'
                + '<div id="sort-nav">'
                + sortMenu
                + '</div>'	
        );
        // Highlight current sort as selected
        $('#results-header ul#sort-list a[rel='+currentSort+']').parent().addClass('selected');
        
        
        /**************/
        /* Pagination */  
        /**************/
        if (data['total'] === 0) {
            container.append('<p>No results found</p>');	    	
        } else {
            resultStart = data['start'];
            resultLength = data['results'].length;
            resultEnd = resultStart + resultLength - 1;
            resultTotal = data.total;
            pageCurr = (data['start'] - 1)/10 + 1;
            pageTotal = Math.ceil(data.total/data['page-length']);		    
            prevStart = resultStart - data['page-length'];
            prevLink = (pageCurr > 1) ? '<a href="javascript:;" id="prev" rel="' + prevStart + '">&lt;</a>' : '';
            nextStart = resultStart + data['page-length'];
            nextLink = (pageCurr < pageTotal) ? '<a href="javascript:;" id="next" rel="' + nextStart + '">&gt;</a>' : '';            
            container.append('<p class="pagination">' + prevLink + ' ' + resultStart + ' to ' + resultEnd + ' of ' + resultTotal + ' ' + nextLink + '</p>');
        }
        
        /*******************/
        /* Display results */  
        /*******************/
        
        // Cycle through each result
        for (var i=0; i < data['results'].length; i++) {
            // Raw metadata for this result
            meta = data['results'][i].metadata;
            
            // Title link section
            try {
                titleContent = '';
                // Ensure metadata is an array
                abstractTitle = wrapArray(config.metadata.columns[0]['abstract-title']);
                for (var c in abstractTitle) {
                    // literal is user-defined text
                    if (abstractTitle[c]['type'] === 'literal') {
                        titleContent += '<span>' + abstractTitle[c]['text'] + '</span>';
                    // value is from the document XML
                    } else if (abstractTitle[c]['type'] === 'value') {
                        var key = '';
                        if (abstractTitle[c]['attr']) {
                            // for attribute range indexes, key is element and attribute names concatenated with "_"
                            key = abstractTitle[c]['elem'] + '_' + abstractTitle[c]['attr'];
                        } else {
                            // for element range indexes (attr property does not exist), key is element name
                            key = abstractTitle[c]['elem'];
                        }
                        className = key.replace(/[^_a-z0-9-]/gi, '_'); // Ensure safe class name
                        titleContent += '<span class="ml-' + className + '">' + getMeta(key, meta) + '</span>';
                    }
                }
            } catch(e){}
            
            // Snippet section
            try { 		
                // We maintain snippets in 2 variables - one for long and another for short snippets
                // We cannot use one variable, 'cos we truncate short snippets to 100 chars. 
                // Instead of adding logic before truncation to ensure that HTML tags are consistent,
                // we form the short snippet separately and ensure that tags are consistent as it is being formed
                // We stopped adding to shortSnippet if we find that its length (excluding tags) has exceeded
                // 100 chars. We do this in a fashion that we do not 'cut' in the middle of a matching text
                longSnippet = '';
                shortSnippet = '';
                snippetLength = 0;            	

                matches = data['results'][i].matches;
                for (var k in matches) {
                    // snippet may be an array (if there are highlighted
                    // terms in it)
                    if (data['results'][i].matches[k]['match-text'] instanceof Array) {
                        matchingTextLength = data['results'][i].matches[k]['match-text'].length;
                        
                        // shortSnippetUpdated variable is used to track if we updated the shortSnippet with
                        // this matching text
                        var shortSnippetUpdated = false;
                        // concat array terms
                        for ( var j in data['results'][i].matches[k]['match-text']) {
                            // mark up the highlighted terms

                            if (data['results'][i].matches[k]['match-text'][j] instanceof Object) {
                                longSnippet += '<span class="highlight">'
                                        + encodeTags(data['results'][i].matches[k]['match-text'][j]['highlight'])
                                        + '</span>';
                                if (snippetLength <= 100) {
                                    shortSnippet = longSnippet;
                                    shortSnippetUpdated = true;
                                }

                                snippetLength += (data['results'][i].matches[k]['match-text'][j]['highlight']).length;
                            } else {
                                longSnippet += encodeTags(data['results'][i].matches[k]['match-text'][j] + ' ');
                                
                                if (snippetLength <= 100) {
                                    shortSnippet = longSnippet;
                                    shortSnippetUpdated = true;
                                }
                                snippetLength += (data['results'][i].matches[k]['match-text'][j]).length;
                            }
                        }
                        if (matches.length > 1) {
                            longSnippet += " | ";
                            
                            if (shortSnippetUpdated === true) { 
                                shortSnippet += " | ";
                            }
                            
                            snippetLength += 3;
                        }
                        // otherwise, snippet is a string
                    } else {
                        longSnippet += encodeTags(data['results'][i].matches[k]['match-text']);
                        snippetLength = longSnippet.length;
                        
                        shortSnippet += truncStr(longSnippet, 100);
                    }
                }
            } catch(e){}
            
            // Metadata section
            try {
                metaContent = '';
                // Ensure metadata is an array
                abstractMetadata = wrapArray(config.metadata.columns[0]['abstract-metadata']);
                for (var c in abstractMetadata) {
                    // literal is user-defined text
                    if (abstractMetadata[c]['type'] === 'literal') {
                        metaContent += '<span>' + abstractMetadata[c]['text'] + '</span>';
                    // value is from the document XML
                    } else if (abstractMetadata[c]['type'] === 'value') {
                        var key = '';
                        if (abstractMetadata[c]['attr']) {
                            // for attribute range indexes, key is element and attribute names concatenated with "_"
                            key = abstractMetadata[c]['elem'] + '_' + abstractMetadata[c]['attr'];
                        } else {
                            // for element range indexes (attr property does not exist), key is element name
                            key = abstractMetadata[c]['elem'];
                        }
                        className = key.replace(/[^_a-z0-9-]/gi, '_'); // Ensure safe class name
                        metaContent += '<span class="ml-' + className + '">' + getMeta(key, meta) + '</span>';
                    }
                }
            } catch(e){}

            // Display short or long version of snippet?
            shortDisplay = (snippetStatus === 'short') ? 'inline' : 'none';
            longDisplay = (snippetStatus === 'long') ? 'inline' : 'none';
            
            if (titleContent === undefined || titleContent === '') {
              titleContent = data.results[i].uri;
            }
            
            // Assemble result sections and display
            content = '';
            content += '<p class="item">';
            content += '<span class="title"><a href="/v1/documents?uri=' + encodeURIComponent(data['results'][i].uri) + '" target="_new">' + titleContent + '</a></span>';
            content += '<br/>';
            
            content += '<span class="snippet short" style="display:'+shortDisplay+'">' + shortSnippet + '</span>';
            content += '<span class="snippet long" style="display:'+longDisplay+'">' + longSnippet + '</span>';
            content += '<br/><span class="metadata">' + metaContent + '</span>';
            content += '</p>';
            container.append(content);
        }

            
        /************/
        /* Eventing */  
        /************/
        
        // Handle pagination next
        $('#'+containerID+' .pagination').on('click', '#next', function (e) {
            e.preventDefault();
            e.stopPropagation();
            container.trigger('page', {page: $('#next').attr('rel')});
        });
        
        // Handle pagination previous
        $('#'+containerID+' .pagination').on('click', '#prev', function (e) {
            e.preventDefault();
            e.stopPropagation();
            container.trigger('page', {page: $('#prev').attr('rel')});
        });
        
        // Handle sort menu click, open/close
        $('#'+containerID+' #results-header').on('click', '#sort-nav', function (e) {
          e.preventDefault();
          e.stopPropagation();
          $('ul#sort-list').toggle();
          });
        
        
        // Handle clicks outside of sort menu
        $('html').click(function(event) {
            if ($(event.target).parents('#sort-nav').length < 1) {
                $('ul#sort-list').hide();
            }
        });
        
        // Handle sort item click, update query
        $('#'+containerID+' #results-header').on('click', 'ul#sort-list li a', function (e) {
          e.preventDefault();
          e.stopPropagation();
          currentSort = $(this).attr('rel');
          widget.updateQuery({
              sort: currentSort,
              page: 1 // reset pagination when sort submitted
          });
          });
        
        // Handle snippet short click
        $('#'+containerID+' #results-header').on('click', '#snippet-short', function (e) {
          e.preventDefault();
          e.stopPropagation();
          $('.snippet.short').show();
          $('.snippet.long').hide();
          $('.snippet-button').removeClass('selected');
          $(this.parentElement).addClass('selected');
          snippetStatus = 'short';
          });
        
        // Handle snippet long click
        $('#'+containerID+' #results-header').on('click', '#snippet-long', function (e) {
          e.preventDefault();
          e.stopPropagation();
          $('.snippet.short').hide();
          $('.snippet.long').show();
          $('.snippet-button').removeClass('selected');
          $(this.parentElement).addClass('selected');
          snippetStatus = 'long';
          });
      }  
    };
    
    widget = ML.createWidget(container, renderCB, 'results');
};
