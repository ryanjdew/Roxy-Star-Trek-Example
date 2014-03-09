<?xml version="1.0" encoding="UTF-8"?>
<!--
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
//-->
<xsl:stylesheet version="2.0" exclude-result-prefixes="xhtml xdmp _1" extension-element-prefixes="xdmp map" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns="http://www.w3.org/1999/xhtml" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:xdmp="http://marklogic.com/xdmp" xmlns:map="http://marklogic.com/xdmp/map" xmlns:search="http://marklogic.com/appservices/search" xmlns:_1="http://marklogic.com/wikipedia">


<!-- uncomment out the following to define styling for result document //-->
<!--xsl:template match="/" mode="full">
<html>
<head>
    <title>Custom Project Title</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf8"/>
    <meta http-equiv="X-UA-Compatible" content="IE=9"/>
    <link type="text/css" rel="stylesheet" href="/application/css/reset.css" media="screen, print"/>
    <link type="text/css" rel="stylesheet" href="/application/css/style.css" media="screen, print"/>
    <link type="text/css" rel="stylesheet" href="/application/skin.css" media="screen, print"/>
    <link type="text/css" rel="stylesheet" href="/application/app.css" media="screen, print"/>
    <link type="text/css" rel="stylesheet" href="/application/custom/app.css" media="screen, print"/>
    <meta name="user" content="{xdmp:get-current-user()}"/>
</head>
<body>
  <xsl:copy-of select="map:get($params,'mode')"/>
  <div id="container"> 	
    <div id="header">
      <h1 id="logo">
        Custom Project Logo        
      </h1>
      <div class="user">Welcome, <span id="username"><xsl:value-of select="xdmp:get-current-user()"/></span></div>
    </div>
    <div id="content" class="subpage">
      <div id="content-area-container">
        <div id="content-area">
          <xsl:apply-templates/>
        </div>
      </div>
    </div>		
    <div id="footer" class="footer">
	    	<p>
	    		<span class="copyright">©2012-2014, MarkLogic, All Rights Reserved.</span>
	    		<a href="/content/help">Help</a> <span class="pipe"></span> 
	    		<a href="/content/contact">Contact MarkLogic</a> <span class="pipe"></span> 
	    		<a href="/content/terms">Terms of Use</a>
	    	</p>
    </div>		
  </div>
  <div id="debug"></div>
  <script src="/application/skin.js" type="text/javascript"></script>
</body>
</html>
</xsl:template-->

<!-- uncomment out the following to define styling for map widget marker infowindow result //-->
<!--xsl:template match="/" mode="info">
    <div class="infowindow">
    <strong><xsl:value-of select="substring(.,1,30)"/></strong><br/>
    <p><xsl:copy-of select="search:snippet(.,search:parse(&quot; &quot;))"/>
    <a href="/v1/documents?uri={xdmp:node-uri(.)}" target="document">more...</a></p></div>
</xsl:template-->
  
<!-- uncomment to style example oscars data, review /application/app-content.xsl, the following is an example for Oscars -->
 <!-- xsl:template match="_1:name">
    <h1 class="render-film-title">ACTOR: <xsl:apply-templates/></h1>
  </xsl:template-->

</xsl:stylesheet>