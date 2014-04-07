xquery version "1.0-ml";

(: This ia a REST extension that takes data recieved and 
 : attempts to find semantically relevant information.
 :)
module namespace sem-int =
  "http://marklogic.com/rest-api/resource/semantic-interpreter";

declare namespace roxy =
    "http://marklogic.com/roxy";
declare default function namespace
  "http://www.w3.org/2005/xpath-functions";
declare option xdmp:mapping "false";


(: Query the data for relevant triples :)
declare %roxy:params("query=xs:string") function sem-int:get(
    $context as map:map,
    $params  as map:map
) as document-node()*
{
    let $output-types :=
        map:put($context,"output-types","application/xml") 
    let $query := element query {normalize-space(map:get($params,"query"))}
    return
    if ($query eq '')
    then
      document {
        <result/>
      }
    else
      let $reverse-query := cts:reverse-query($query)
      let $predicates := 
          cts:search(/predicate,$reverse-query)
      let $resources := 
          cts:search(/resource,$reverse-query)
      let $predicates-exist as xs:boolean := exists($predicates)
      let $matches-found as xs:boolean := $predicates-exist or exists($resources)
      let $matching-query-text :=
          if ($matches-found)
          then
            cts:highlight(
              $query,
              cts:or-query((
                ($predicates,$resources)//reverse-query/cts:* ! cts:query(.)
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
          else
            $query
      let $match-ratio :=
        if ($query eq '' and $matches-found)
        then
          0
        else
          sem-int:word-count(string-join($matching-query-text/match," ")) div sem-int:word-count($query)
      let $matching-triples :=
        if ($predicates-exist)
        then
          let $resource-iris := $matching-query-text/match[@type eq "resource"]/@iri ! sem:iri(.),
              $predicate-iris := $matching-query-text/match[@type eq "predicate"]/@iri ! sem:iri(.)
          return 
            sem-int:filter-reciprocal-triples(
              cts:triples(
                $resource-iris,
                $predicate-iris,
                ()
              ),(
              cts:triples(
                (),
                $predicate-iris,
                $resource-iris
              ))
            )
        else (
          $resources/meta/sem:triples/sem:triple[1]/sem:triple(.)
        )
    return 
      document { 
        element result {
          comment {"Data made available via Freebase (http://freebase.com)"},
          $query,
          element parsed-query{
            attribute comprehension {$match-ratio},
            $matching-query-text/node()
          },
          for $triple in $matching-triples
          let $subject-iri := sem:triple-subject($triple)
          let $object-iri := sem:triple-object($triple)
          let $object-data := sem-int:select-item($object-iri,$resources[@uri eq $object-iri])/(@*|*)
          let $predicate-iri := sem:triple-predicate($triple)
          let $predicate-data := sem-int:select-item($predicate-iri,$predicates[@uri eq $predicate-iri])/(@*|*)
          return
            element matching-triple {
              element human-readable{
                if ($predicates-exist)
                then 
                  sem-int:human-readable-triple($triple,($resources,$predicates))
                else 
                  ()
              },
              element subj {
                sem-int:select-item($subject-iri,$resources[@uri eq $subject-iri])/(@*|*)
              },
              if ($predicates-exist and exists($object-data))
              then (
                element pred {
                  $predicate-data
                },
                element obj {
                  $object-data
                }
              ) else ()
            }
        }
      } 
};

declare %private function sem-int:filter-reciprocal-triples(
  $triple-group-1 as sem:triple*, 
  $triple-group-2 as sem:triple*
) as sem:triple* {
    $triple-group-1,
   (for $triple in $triple-group-2
    where not(
            some $t in $triple-group-1 
            satisfies sem:triple-object($triple) eq sem:triple-subject($t) 
                      and sem:triple-predicate($triple) eq sem:triple-predicate($t)
                      and sem:triple-subject($triple) eq sem:triple-object($t))
    return $triple)
};

declare variable $content-qns as xs:QName+ := (xs:QName('predicate'),xs:QName('resource'));

(:
Take a triple and make it more human readable.
:)
declare %private function sem-int:human-readable-triple($sem-triple as sem:triple,$matches as element()*) as xs:string {
  fn:normalize-space(
    fn:string-join(
      for $part in (sem:triple-subject($sem-triple),sem:triple-predicate($sem-triple),sem:triple-object($sem-triple)) 
      let $element := sem-int:select-item($part,$matches[@uri eq $part])
      return
        sem-int:resource-name($element)
      ,
      " "
    )
  )
};



(: get a name associated with a resource :)
declare %private function sem-int:select-item(
  $triple-part as item(), 
  $element as element()?
) as element()? {
  if ($element)
  then 
    $element
  else
    cts:search(/*[node-name(.) = $content-qns],
      cts:element-attribute-value-query($content-qns,xs:QName('uri'),$triple-part,"exact"),
      "unfiltered"
    )
};


(: get a name associated with a resource :)
declare %private function sem-int:resource-name($element as element()?) as xs:string? {
  ($element/(name|phrase))[1]
};

declare %private function sem-int:word-count($string as xs:string) as xs:integer {
  fn:count(
    cts:tokenize($string)[. instance of cts:word]
  )
};

(: determine the appropriate item that caused a cts:query to match :)
declare %private function sem-int:appropriate-item($items as item()*,$matching-queries as cts:query*) as item()? {
  let $most-accurate-query :=
        (
        for $query in $matching-queries
        let $query-xml := document {$query}/*
        order by fn:string-length($query-xml/cts:text) descending
        return $query-xml
        )[1]
  let $matching-item := ($items[.//*[deep-equal(.,$most-accurate-query)]])[1]
  return $matching-item
};

declare variable $item-qns as xs:QName+ := (xs:QName('predicate'),xs:QName('resource'));
declare variable $query-options as xs:string+ := ("stemmed","case-insensitive","whitespace-insensitive", "punctuation-insensitive","diacritic-insensitive");

(: 
Allow for the updating of phrases associated with a resource or predicate.
The PUT payload should look like the following.
<phrases>
  <phrase>in relationsip with</phrase>
  <phrase>dating</phrase>
  <phrase>courting</phrase>
</phrases>
 :)
declare %roxy:params("uri=xs:string") function sem-int:put(
    $context as map:map,
    $params  as map:map,
    $input   as document-node()*
) as document-node()?
{
    (: get 'input-types' to use in content negotiation :)
    let $input-types := map:get($context,"input-types")
    let $negotiate := 
        if ($input-types = ("application/xml","application/json"))
        then () (: process, insert/update :) 
        else error((),"ACK",
          "Invalid type, accepts application/xml or application/json only")
    let $uri := map:get($params,"uri")
    let $item :=
          cts:search(fn:collection()/*[node-name(.) = $item-qns],
            cts:element-attribute-value-query($item-qns,xs:QName('uri'),$uri,"exact"),
            "unfiltered"
          )[1]
    return 
      if (exists($uri) and exists($item))
      then (
        let $phrases := 
            if ($input-types eq "application/xml") 
            then $input/phrases/phrase
            else 
              json:array-values(map:get(xdmp:from-json($input),"phrases"))
        let $new-reverse-query := 
            element reverse-query {
              $phrases ! cts:word-query(string(.),$query-options)
            }
        return (
          xdmp:node-replace($item/meta/reverse-query,$new-reverse-query),
          document {
            element response {
              element success{true()}
            }
          }
        )
      ) else 
        document {
          element response {
            element success{false()},
            element uri {$uri}
          }
        }
};
