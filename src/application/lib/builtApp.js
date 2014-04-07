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

// loading animation only plays if it takes more than 500 ms to load something, and it continues playing for 2000ms to prevent it from "flashing" on the screen
var waitingForQuery = false;
var waitingForSpinner = false;
$('body').append($(document.createElement('div')).attr('id','loading'));

$('body').ajaxStop(function () {
	waitingForQuery = false;
	
	if (!waitingForSpinner) {
		$('#loading').hide();
	}
}).ajaxStart(function () {
	waitingForQuery = true;
	setTimeout((function () {
		if (waitingForQuery) {
			waitingForSpinner = true;
			
			setTimeout((function () {
				waitingForSpinner = false;
				
				if (!waitingForQuery) {
					$('#loading').hide();
				}
			}), 2000);
			
			$('#loading').show();
		}
	}), 500);

});

$('body').on('error', function (e, msg) {
  alert('A server error has occurred.');  
  throw msg;
});

// IE specific bookmarking handler. Adds bookmark url link to upper right corner of page
$('body').on('bookmarkUrl', function (e, url) {
	if ($('#bookmarkUrl').length === 0) {
		$('#header h1#logo').append('<div id="bookmarkUrl"></div>');
	}
	$('#bookmarkUrl').html('<a href="' + url + '" title="Current page state link"><img src="/application/images/url-bookmark-icon.png" /></a>');
});