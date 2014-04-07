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
<xsl:stylesheet version="2.0" exclude-result-prefixes="xdmp" extension-element-prefixes="xdmp" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns="http://www.w3.org/1999/xhtml" xmlns:xdmp="http://marklogic.com/xdmp">
  <xsl:output method="xhtml" doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN" doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd" encoding="utf8" omit-xml-declaration="yes" indent="yes"/>
  
  <xsl:param name="content" select="''"/>
  
  <xsl:template match="/">
    <xsl:apply-templates/>
  </xsl:template>
  
  <xsl:template match="@*|*|processing-instruction()|comment()">
    <xsl:copy>
      <xsl:apply-templates select="*|@*|text()|processing-instruction()|comment()"/>
    </xsl:copy>
  </xsl:template>
  <xsl:template match="*:head">
    <head>
      <meta name="user" content="{xdmp:get-current-user()}"/>
      <meta name="version" content="{xdmp:version()}"/>
      <meta name="content-selector" content="{$content}"/>
      <xsl:apply-templates/>
    </head>
  </xsl:template>
  <xsl:template match="*:span[@id eq 'username']">
    <span id="username"><xsl:value-of select="xdmp:get-current-user()"/></span>           
  </xsl:template>
    
  <xsl:include href="/application/custom/app.xsl"/>
</xsl:stylesheet>