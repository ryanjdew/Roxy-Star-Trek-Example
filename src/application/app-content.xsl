<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" exclude-result-prefixes="html" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns="http://www.w3.org/1999/xhtml" xmlns:html="http://www.w3.org/1999/xhtml" xmlns:_2="http://marklogic.com/cts" xmlns:_1="http://marklogic.com/semantics">
  <xsl:output omit-xml-declaration="yes" indent="yes"/>
  <xsl:template match="meta"/>
  <xsl:template match="reverse-query"/>
  <xsl:template match="_1:triple"/>
  <xsl:template match="_1:triples"/>
  <xsl:template match="_2:word-query"/>
  <xsl:template match="_1:object"/>
  <xsl:template match="_2:option"/>
  <xsl:template match="_1:predicate"/>
  <xsl:template match="_1:subject"/>
  <xsl:template match="birth-place"><div class="render-birth-place"><xsl:apply-templates/></div></xsl:template>
  <xsl:template match="description"><div class="render-description"><xsl:apply-templates/></div></xsl:template>
  <xsl:template match="organizations"><div class="render-organizations"><xsl:apply-templates/></div></xsl:template>
  <xsl:template match="ranks"><div class="render-ranks"><xsl:apply-templates/></div></xsl:template>
  <xsl:template match="resource"><div class="render-resource"><xsl:apply-templates/></div></xsl:template>
  <xsl:template match="various-species"><div class="render-various-species"><xsl:apply-templates/></div></xsl:template>
  <xsl:template match="name"><span class="render-name"><xsl:apply-templates/></span></xsl:template>
  <xsl:template match="organization"><span class="render-organization"><xsl:apply-templates/></span></xsl:template>
  <xsl:template match="species"><span class="render-species"><xsl:apply-templates/></span></xsl:template>
  <xsl:template match="_2:text"><span class="render-text"><xsl:apply-templates/></span></xsl:template>
  <xsl:template match="html:*"><xsl:copy><xsl:copy-of select="@*"/><xsl:apply-templates/></xsl:copy></xsl:template>
</xsl:stylesheet>