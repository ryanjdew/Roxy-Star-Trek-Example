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
ML.createSidebar = function (containerID, config) {
    config = config || {};

    // private properties
    var container,
        widget,
        htmlChiclets,
        htmlFacets,
        constraint,
        name,
        nameEscaped,
        valueEscaped,
        label,
        constraintType,
        chicletHTML,
        selected,
        hidden,
        exclude,
        facet,
        limit,
        moreItems,
        itemDisplay,

        // private methods
        displayChiclet,
        displayInSidebar,
        buildChiclet,
        buildFacet,
        addToSelected,
        removeFromSelected,
        trackHidden,
        renderCB,
        truncateStr,
        getBucketLabel;

    container = $('#' + containerID);
    selected = {};
    hidden = [];
    moreItems = [];
    exclude = ['geospatial'];
    
    limit = config.limit || 99; // More... link minimum

    // Display facet in sidebar based on type and setting?
    displayInSidebar = function (facet) {
        return ($.inArray(facet.type,exclude) === -1) && (facet['side-bar'] === 'true');
    };
    
    // Track facets that have been selected (and have chiclets displayed)
    addToSelected = function (facet, label) {
        selected[facet] = label;		
    };
        
    // Remove facet from selected list when chiclet is deleted
    removeFromSelected = function (facet) {
        delete selected[facet];		
    };

    // Track facet lists that have been collapsed (list items not shown)
    trackHidden = function (facet) {
        var index = $.inArray(facet,hidden);
        if (index > -1) {
            hidden.splice(index, 1);
        } else {
            hidden.push(facet);
        }
    };

    // Track facet lists that have had their "more" buttons clicked
    trackMoreItems = function (facet) {
        var index = $.inArray(facet,moreItems);
        if (index > -1) {
            moreItems.splice(index, 1);
        } else {
            moreItems.push(facet);
        }
    };

    // Truncate long strings based on a length limit
    truncateStr = function (str, length) {
        var returnStr;
        if (str.length > length) {
            returnStr = str.slice(0, length - 3) + "...";
        } else {
            returnStr = str;
        }
        return returnStr;
    };

    // Get bucket label based on bucket name from config bucket objects
    getBucketLabel = function (config, name) {
        var result = '';
        for (i in config.bucket) {
            if (config.bucket[i].name === name) {
                result = config.bucket[i]['_value'];
                break;
            }
        }
        return result;
    };

    renderCB = function (data) {
        if(!data.boundedbox){

        var facet = '';
        htmlChiclets = '';
        htmlFacets = '';
        // Build chiclets and facet lists
        for (facet in config.facets) {
            if (config.facets[facet] !== undefined) {
                // not in array of facet types to exclude and side-bar setting selected
                if (displayInSidebar(config.facets[facet])) {
                    htmlChiclets += buildChiclet(facet);
                    htmlFacets += buildFacet(facet, data);
                }
            }
        }
        container.html(htmlChiclets + htmlFacets); 
        }
    };
    
    widget = ML.createWidget(container, renderCB);
    
    for (facet in config.facets) {
        if (config.facets[facet] !== undefined) {
            container.trigger('constraintType', {facet: facet, type: config.facets[facet].type});
        }
    }
    
    
    // Handle facet item clicks
    container.on('click', '.facet-item a', function (e) {
        e.preventDefault();
        // What facet was clicked and what name?
        constraint = this.parentElement.parentElement.parentElement.id.substring(11); // ID text after "facet-list-"
        name = $(this).attr('rel');
        label = $(this).html();
        constraintType = config.facets[constraint].type;
        
        displayChiclet(constraint, name, label, config.facets[constraint]);
        // Update UI
        widget.updateQuery({
            value: [name], 
            facet: constraint,
            constraintType: constraintType,
            noShadow: true
        });
    });
    
    // Translate select event on a facet into a chiclet
    // Can occur when loading bookmark
    container.on('select', function (e, data) {
        if (config.facets[data.facet] !== undefined) {
            var absolute = config.facets[data.facet]['absolute-buckets'];
            if(absolute.use === 'true') {
                label = getBucketLabel(absolute, data.value[0]);
            } else {
                label = data.value[0];
            }
            displayChiclet(data.facet, data.value[0], label, config.facets[data.facet]);			
        }
    });
        
    displayChiclet = function (constraint, name, label, configFacets) {
        chicletHTML = '';
        // Replace chiclet HTML with new text
        if (configFacets.label['_value'] !== undefined) {
            chicletHTML = configFacets.label['_value'] + ': ' + label;
        } else {
            chicletHTML = configFacets.label + ': ' + label;
        }
        
        container.find('#chiclet-'+constraint+' .content').html(truncateStr(chicletHTML, 32));
        // Hide list and show chiclet
        container.find("#facet-list-"+constraint).hide();
        container.find('#chiclet-'+constraint).show();
        addToSelected(constraint, label);
    };
    
    // Handle chiclet close clicks
    container.on('click', 'div.close-chiclet a', function (e) {
        e.preventDefault();
        // What facet was clicked?
        constraint = this.parentElement.parentElement.id.substring(8); // ID text after "chiclet-"
        constraintType = config.facets[constraint].type;

        // Hide chiclet and show list
        container.find("#facet-list-"+constraint).show();
        container.find('#chiclet-'+constraint).hide();
        // Update UI
        widget.updateQuery({
            facet: constraint // deselecting only needs a facet
        });
        removeFromSelected(constraint);
        return false;
    });

    // Handle title clicks
    container.on('click', 'div.facet-list a.tipdown', function (e) {
        // What facet was clicked?
        constraint = this.id.substring(12); // ID text after "facet-title-"
        // Toggle arrow
        container.find("a#facet-title-"+constraint).toggleClass('open');
        // Update UI
        container.find("#facet-list-"+constraint+' ul').slideToggle(100);
        // Keep track of what's hidden
        trackHidden(constraint);
        return false;
    });

    // Handle more... clicks
    container.on('click', 'li.facet-more', function (e) {
        // What facet was clicked?
        constraint = $(this).attr('rel');
        // Toggle items after config limit
        $('div#facet-list-' + constraint + ' ul:first li:gt(' + (limit-1) + ').facet-item').toggle();
        // Toggle links
        $(this).find('span').toggle();
        trackMoreItems(constraint);
        return false;
    });

    buildChiclet = function (constraint) {
        var html = '',
            label,
            chicletDisplay,
            chicletContent;

        if (config.facets[constraint].label['_value'] !== undefined)
            label = config.facets[constraint].label['_value'];
        else
            label = config.facets[constraint].label;

        chicletDisplay = (selected[constraint] !== undefined) ? '' : ' hidden';
        html = '<div id="chiclet-' + constraint + '" class="chiclet'+chicletDisplay+'">';
        chicletContent = (selected[constraint] !== undefined) ? label+': '+selected[constraint] : '';
        html += '<div class="close-chiclet"><a href="#"></a></div><span class="content" title="'+chicletContent+'">'+truncateStr(chicletContent, 32)+'</span>';
        html += '</div><!-- end chiclet -->';
        return html;			
    };

    buildFacet = function (constraint, data) {
        var html = '',
            label,
            facetData,
            listDisplay,
            listHidden,
            listTipdown;
        if (data.facets[constraint] !== undefined) {
            facetData = data.facets[constraint].facetValues;
            
            if (config.facets[constraint].label['_value'] !== undefined) {
                label = config.facets[constraint].label['_value'];
            } else {
                label = config.facets[constraint].label;
            }

            listDisplay = (selected[constraint] !== undefined) ? ' hidden' : '';
            if ($.inArray(constraint,hidden) > -1) {
                listHidden = ' hidden';
                listTipdown = '';
            } else {
                listHidden = '';
                listTipdown = ' open';
            }
            html = '<div id="facet-list-'+ constraint + '" class="facet-list'+listDisplay+'">';
            html += '<a href="#" id="facet-title-'+ constraint + '" class="tipdown'+listTipdown+'" title="tip down">';
            html += '<div class="facet-title-label" title="'+label+'">' + truncateStr(label, 32) + '</div>';
            html += '</a>';

            if (facetData !== undefined) {
                html += '<ul class="'+listHidden+'">';
                var i, len;
                for (i=0,len=facetData.length; i < len; i = i + 1) {
                	// Handle any quotes in facet data
                	nameEscaped = facetData[i].name.toString().replace(/"/g, '&quot;');
                	valueEscaped = facetData[i].value.toString().replace(/"/g, '&quot;');
                    // Do not display item if more... unclicked and item number over limit
                    itemDisplay = (($.inArray(constraint, moreItems) === -1) && (i > limit-1)) ? ' hidden' : '';
                    html += '<li class="facet-item' + itemDisplay + '">'
                         + '<a href="#" rel="'+nameEscaped+'" title="'+nameEscaped+'">' + truncateStr(valueEscaped, 32) + '</a> '
                         + '<span class="count">(' + facetData[i].count + ')</span>'
                         + '</li>';
                }
                
                // Display more... links if over limit
                if (facetData.length > limit) {
                    var moreClass, lessClass;
                    if ($.inArray(constraint, moreItems) > -1) {
                        moreClass = ' hidden';
                    } else {
                        lessClass = ' hidden'
                    }
                    html += '<li class="facet-more" rel="' + constraint + '"><span class="' + lessClass + '">less</span><span class="' + moreClass + '">more...</span></div>';            	
                }

                html += '</ul>';
            }
            
            html += '</div><!-- end facet-list -->';
        }

        return html;
    };

};
