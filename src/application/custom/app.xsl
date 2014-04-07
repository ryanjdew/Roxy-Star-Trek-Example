<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" extension-element-prefixes="xdmp" xmlns="http://www.w3.org/1999/xhtml" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xdmp="http://marklogic.com/xdmp"> 

  <!-- customize app pages (index, contact, help, terms)  //-->

  <!-- this template removes @xml:space attribute //-->
  <xsl:template match="@xml:space"/>

  <!-- display text file content //-->
  <xsl:template match="/text()">
     <xsl:apply-templates select="xdmp:unquote(.)"/>
  </xsl:template>
  
  <!-- uncomment to overwrite custom header //--> 
  <!-- 
       <xsl:template match="*:div[@id eq 'header']">
       <div id="header">
       <h1 id="logo">Custom Header</h1>
       </div>
       </xsl:template>
  //-->

  <!-- uncomment to overwrite custom footer //--> 
  <!--
      <xsl:template match="*:div[@id eq 'footer']">
      <div id="footer" class="footer">
      <p>Custom Footer</p>
      </div>
      </xsl:template>
  //-->

  <!-- uncomment to use custom results.js widget (copy of results.js would need to be copied too custom/lib/viz/results/results.js) //--> 
  <!--
     <xsl:template match="*:script[@src='/application/lib/viz/results/results.js']">
      <script type="text/javascript" src="/application/custom/results.js"></script>
     </xsl:template>
  //-->
  
</xsl:stylesheet>