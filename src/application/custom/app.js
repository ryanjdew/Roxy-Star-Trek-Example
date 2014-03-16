/* Add any custom scripting for your built app here.
 * This file will survive redeployment.
 */

var SIP = SIP || {};

SIP.resourceToHTML = function(resource, edit_panel){
  var html = '';
  if (edit_panel && resource.length) {
    var uri = resource.attr("uri");
    html += 
          '<dt>Associated phrases:&nbsp;</dt>'+
          '<dd><ul class="sip-phrases" data-uri="'+ uri +'">';
    resource.find("text").each(function() {
      html += '<li class="sip-phrase"><div class="chiclet"><div class="close-chiclet"><a href="#"></a></div>'+$(this).text()+'</div></li>';
    });
    html += '<li><a class="sip-add-phrase" href="#">Add Phrase</a></li></ul>';
  }
  resource.children(":not(meta)").each(function(index) {
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

SIP.getInfoPanel = function (query){
  SIP.edit_panel = (typeof SIP.edit_panel === "undefined") ? false : SIP.edit_panel;
  var edit_link = (SIP.edit_panel)?'':('(<a href="/content/edit-related-phrases?q='+encodeURI(query)+'">Edit Related Phrases</a>)');
  $("#widget-1").html('');
  $.get(
      "/v1/resources/semantic-interpreter?rs:query="+encodeURI(query),
      function(data) {
        $(data).find("matching-triple").each(function(index) {
          var current_triple = $(this);
          var col1 =  "<dl class='sem-col1'>"+SIP.resourceToHTML(current_triple.find("subj"),SIP.edit_panel)+"</dl>";
          var col2 = (SIP.edit_panel)?"<dl class='sem-col2'>"+SIP.resourceToHTML(current_triple.find("pred"),SIP.edit_panel)+"</dl>":"";
          var col3 =  "<dl class='sem-col"+((SIP.edit_panel)?'3':'2')+"'>"+SIP.resourceToHTML(current_triple.find("obj"),SIP.edit_panel)+"</dl>";
          $("#widget-1").append(
              "<h3>"+current_triple.find("human-readable").text()+" "+edit_link+"</h3>"+
              col1+
              col2+
              col3);
        });
      },
      "xml"
  );
};

var widget = ML.createWidget($('#widget-1'), function (data) {
  SIP.getInfoPanel(data.qtext);
});