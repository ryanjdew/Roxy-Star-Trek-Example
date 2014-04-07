<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" exclude-result-prefixes="xdmp xhtml" extension-element-prefixes="xdmp" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns="http://www.w3.org/1999/xhtml" xmlns:xdmp="http://marklogic.com/xdmp" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:map="http://marklogic.com/xdmp/map" xmlns:search="http://marklogic.com/appservices/search">
  <xdmp:import-module namespace="http://marklogic.com/appservices/search" href="/MarkLogic/appservices/search/search.xqy"/>
  <xsl:param name="context" as="map:map"/>
  <xsl:param name="params" as="map:map"/>
  <xsl:variable name="mode" select="(map:get($params,&quot;mode&quot;),&quot;full&quot;)[1]"/>
  <xsl:variable name="docid" select="tokenize(map:get($params,&quot;docid&quot;),&quot;,&quot;)"/>
  <xsl:output method="xhtml" doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN" doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd" encoding="utf8" omit-xml-declaration="yes" indent="yes"/>
  <xsl:template match="/" as="item()*">
 <xsl:choose>
 <xsl:when test="xdmp:node-kind(node()) eq 'binary'">
     <xsl:sequence select="map:put($context,'output-type','*/*')"/>
     <xsl:sequence select="."/>
 </xsl:when>
 <xsl:otherwise>
   <xsl:choose>
    <xsl:when test="$mode eq 'info'">
      <xsl:apply-templates select="/" mode="info"/>
    </xsl:when>
    <xsl:otherwise>
      <xsl:apply-templates select="/" mode="full"/>
    </xsl:otherwise>
  </xsl:choose>   
 </xsl:otherwise>
 </xsl:choose> 
</xsl:template>
  <xsl:template match="/" mode="info" as="item()*">
    <div class="infowindow">
    <strong><xsl:value-of select="substring(.,1,30)" disable-output-escaping="no"/></strong><br clear="none"/>
    <p><xsl:copy-of select="search:snippet(.,search:parse(&quot; &quot;))" copy-namespaces="yes"/></p>
    </div>
</xsl:template>
  <xsl:template match="/" mode="full" as="item()*">
<html version="-//W3C//DTD XHTML 1.1//EN">
<head>
    <title>Star Trek Search</title>
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
  <xsl:copy-of select="map:get($params,'mode')" copy-namespaces="yes"/>
  <div id="container"> 	
    <div id="header">
      <h1 id="logo">
        
         Star Trek Search 
      </h1>
      <div class="user">Welcome, <span id="username"><xsl:value-of select="xdmp:get-current-user()" disable-output-escaping="no"/></span></div>
    </div>
    <div id="content" class="subpage">
      <div id="content-area-container">
        <div id="content-area">
          <xsl:apply-templates select="child::node()"/>
        </div>
      </div>
    </div>		
    <div id="footer" class="footer">
	    	<p>
	    		<span class="copyright">© 2012-2014, MarkLogic Corporation, All Rights Reserved.</span>
	    		<a href="/content/help">Star Trek Search Help</a> <span class="pipe"></span> 
	    		<a href="/content/contact">Contact MarkLogic Corporation</a> <span class="pipe"></span> 
	    		<a href="/content/terms">Terms of Use</a>
	    	</p>
    </div>		
  </div>
  <div id="debug"></div>
  <script src="/application/skin.js" type="text/javascript" xml:space="preserve"></script>
</body>
</html>
</xsl:template>
  <xsl:include href="/application/app-content.xsl"/>
  <xsl:include href="/application/custom/content.xsl"/>
</xsl:stylesheet>