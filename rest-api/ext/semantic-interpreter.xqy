xquery version "1.0-ml";

(: This ia a REST extension that takes data recieved and 
 : attempts to find semantically relevant information.
 :)
module namespace sem-int =
  "http://marklogic.com/rest-api/resource/semantic-interpreter";

declare default function namespace
  "http://www.w3.org/2005/xpath-functions";
declare option xdmp:mapping "false";


(: Function responding to GET method - must use local name 'get':)
declare function sem-int:get(
    $context as map:map,
    $params  as map:map
) as document-node()*
{
    (: set 'output-types', used to generate content-type header :)
    let $output-types :=
        map:put($context,"output-types","application/xml") 
    
    let $query := element query {fn:normailize-space(map:get($params,"q"))}
    let $reverse-query := cts:reverse-query($query)
    let $predicates := 
          cts:search(/predicate,$reverse-query)
    let $resources := 
          cts:search(/resource,$reverse-query)
    let $matching-query-text :=
          cts:highlight(
            $query,
            cts:or-query((
              ($predicates,$resources)/reverse-query/cts:* ! cts:query(.)
            )),
            let $matching-item := 
              sem-int:appropriate-item(($predicates,$resources),$cts:queries)
            return 
              element match {
                attribute iri {fn:string($matching-item/@uri)},
                attribute type {fn:local-name($matching-item)},
                $cts:text
              }
          )
    let $match-ratio :=
        if ($query eq '')
        then
          0
        else
          sem-int:matching-characters(fn:string-join($matching-query-text/match,"")) div sem-int:matching-characters($query)
    let $matching-triples :=
          cts:search(//sem:triple,
            if ($predicates or $resources)
            then 
              let $resource-iris := $matching-query-text/match[@type eq "resource"]/@iri ! sem:iri(.),
                  $predicate-iris := $matching-query-text/match[@type eq "predicate"]/@iri ! sem:iri(.)
              return
                cts:or-query((
                  cts:triple-range-query(
                    $resource-iris,
                    $predicate-iris,
                    (),
                    "=",
                    (),
                    16
                  ),
                  cts:triple-range-query(
                    (),
                    $predicate-iris,
                    $resource-iris,
                    "=",
                    (),
                    8
                  )
                ))
            else (),
            "unfiltered"
        )
    return 
      document { 
        element result {
          for $triple in $matching-triples
          return
            element matching-triple {sem-int:english-readable-triple($triple)}
        }
      } 
    (: must return document node(s) :)
};

declare %private function sem-int:english-readable-triple($sem-triple as element(sem:triple)) as xs:string {
  let $subject-name := sem-int:resource-name($sem-triple/..)
  let $object-triples := cts:search(/sem:triples,
                          cts:element-attribute-value-query(xs:QName('sem:triples'),xs:QName('iri'),$sem-triple/sem:object,"exact"),
                          "unfiltered"
                        )
  let $object-name := sem-int:resource-name($object-triples)
  let $predicate-phrase := cts:search(/predicate,
                            cts:element-attribute-value-query(xs:QName('predicate'),xs:QName('iri'),$sem-triple/sem:predicate,"exact"),
                            "unfiltered"
                          )/phrase
  return fn:normalize-space(fn:string-join(($subject-name,$predicate-phrase,$object-name)," "))
};

declare %private function sem-int:resource-name($sem-triples as element(sem:triples)) as xs:string? {
  let $resource-type := $sem-triples/sem:triple[sem:predicate eq "type"]/sem:object
  let $name-predicate := $subject-type || "/name"
  let $resource-name := $sem-triples/sem:triple[sem:predicate eq $name-predicate]/sem:object
  return $resource-name
};

declare %private function sem-int:matching-characters($string as xs:string) as xs:integer {
  fn:string-length(
    fn:replace(
      $string,
      "\s+",
      ""
    )
  )
};

declare %private function sem-int:appropriate-item($items as item()*,$matching-queries as cts:query*) as item()? {
  let $most-accurate-query :=
        (
        for $query in $matching-queries
        let $query-xml := document {$query}/*
        order by fn:string-length($query-xml/cts:text) descending
        return $query-xml
        )[1]
  let $matching-item := ($items[.//*[fn:deep-equals(.,$most-accurate-query)]])[1]
  return $matching-item
};

declare variable $item-qns as xs:QName+ := (xs:QName('predicate'),xs:QName('resource'));
declare variable $query-options as xs:string+ := ("stemmed","case-insensitive","whitespace-insensitive", "punctuation-insensitive","diacritic-insensitive");

(: Function responding to PUT method - must use local name 'put'. :)
declare function sem-int:put(
    $context as map:map,
    $params  as map:map,
    $input   as document-node()*
) as document-node()?
{
    (: get 'input-types' to use in content negotiation :)
    let $input-types := map:get($context,"input-types")
    let $negotiate := 
        if ($input-types = "application/xml")
        then () (: process, insert/update :) 
        else error((),"ACK",
          "Invalid type, accepts application/xml only")
    let $uri := map:get($context,"uri")
    let $item :=
          cts:search(fn:collection()/*[node-name(.) = $item-qns],
            cts:element-attribute-value-query($item-qns,xs:QName('uri'),$uri,"exact"),
            "unfiltered"
          )[1]
    return 
      if (exists($uri) and exists($item))
      then (
        let $phrases := $input/phrases/phrase
        return (
          xdmp:document-insert(
            xdmp:node-uri($item),
            element {node-name($item)} {
              $item/@*,
              element reverse-query {
                $phrases ! cts:word-query(string(.),$query-options)
              }
              $phrases[1]
            }
          )
          document {element success{true()}}
        )
      ) else 
        document {element success{false()}}
};

(: Function responding to POST method - must use local name 'post'. :)
declare function sem-int:post(
    $context as map:map,
    $params  as map:map,
    $input   as document-node()*
) as document-node()*
{
    xdmp:log("post!")
};

(: Func responding to DELETE method - must use local name 'delete'. :)
declare function sem-int:delete(
    $context as map:map,
    $params  as map:map
) as document-node()?
{
    xdmp:log("delete!")
};