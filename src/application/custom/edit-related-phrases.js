var SIP = SIP || {};

SIP.edit_panel = true;
SIP.updatePhrases = function (phrases) {
  var phrases_xml = '<phrases>';
  phrases.find('.chiclet').each(function() {
    phrases_xml += "<phrase>" + $(this).text() + "</phrase>";
  });
  phrases_xml += "</phrases>";
  $.ajax({
      type: "PUT",
      url: "/v1/resources/semantic-interpreter?rs:uri="+encodeURI(phrases.data("uri")),
      contentType: "application/xml",
      data: phrases_xml
  });
};

$(document).ready(function() {
  $( "#widget-1" ).on( "click", ".sip-phrases .close-chiclet", function(event) {
    var phrases = $(this).parents("ul.sip-phrases"),
        phrase =  $(this).parents("li.sip-phrase");
    phrase.remove();
    SIP.updatePhrases(phrases);
    event.preventDefault();
  });
  $( "#widget-1" ).on( "click", ".sip-phrases button[type='cancel']", function(event) {
    $(this).parents('li').remove();
    event.preventDefault();
  });
  $( "#widget-1" ).on( "submit", ".sip-phrases form", function(event) {
    var input = $(this).find('input').val(),
        phrases = $(this).parents("ul.sip-phrases");
    $(this).replaceWith(
      $('<li/>').
      addClass('sip-phrase').append(
        $('<div />').addClass('chiclet').append(
          $('<div />').addClass('close-chiclet').append(
            $('<a />').attr('href','#'))).append(input))
    ); 
    SIP.updatePhrases(phrases);
    event.preventDefault();
  });
  $( "#widget-1" ).on( "click", ".sip-phrases a.sip-add-phrase", function(event) {
    $(this).parent().before(
      $('<li/>').
        addClass('sip-phrase').
        append(
          $('<form/>').append(
            $('<input />').
            attr('type','text').
            attr('name','phrase')).append(
              $('<input />').
              attr('type','submit').
              attr('value','Add')).append(
                $('<button />').attr('type','cancel').text('Cancel')
              )
      )
    ); 
    event.preventDefault();
  });
});