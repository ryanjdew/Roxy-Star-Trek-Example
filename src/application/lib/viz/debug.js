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

ML.createDebug = function (container, config) {
	config = config || {
		
	};
	
	container.html('<form>'
						+'Query: <input type="text" value="cat" />' 
						+'<button type="submit">Update</button>'
						+'<p></p>'
					+'</form>');
	
	var widget = ML.newWidget(container, function (data, config) {
		config = config || {
			
		};
		container.find('p').html(data.total + " results found");
	});
	
	container.find('form').submit(function (e) {
		e.preventDefault();
		
		widget.updateQuery($('input').val());
		
		return false;
	}).trigger('submit');
};