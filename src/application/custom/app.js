/* Add any custom scripting for your built app here.
 * This file will survive redeployment.
 */

function resourceToHTML(resource){
  var html = '';
  resource.children().each(function(index) {
    var current_item = $(this);
    var children = current_item.children();
    var children_values = [];
    children.each(function() { children_values.push($(this).text()) });
    html += 
          '<dt>'+ this.tagName.toLowerCase() +':&nbsp;</dt>'+
          '<dd>' + ((children.length > 1) ? children_values.join(", ") : current_item.text()) +'</dd>';
  });
  return html;
};

var widget = ML.createWidget($('#widget-1'), function (data) {
  var query = data.qtext
  $("#widget-1").html('');
  $.get(
      "/v1/resources/semantic-interpreter?rs:query="+encodeURI(query),
      function(data) {
        $(data).find("matching-triple").each(function(index) {
          var current_triple = $(this);
          var col1 =  "<dl class='sem-col1'>"+resourceToHTML(current_triple.find("subject"))+"</dl>";
          var col2 =  "<dl class='sem-col2'>"+resourceToHTML(current_triple.find("object"))+"</dl>";
          $("#widget-1").append(
              "<h3>"+current_triple.find("human-readable").text()+"</h3>"+
              col1+
              col2);
        });
      },
      "xml"
  )
});