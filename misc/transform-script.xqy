import module namespace sem = "http://marklogic.com/semantics" 
      at "/MarkLogic/semantics.xqy";
declare variable $misc-map := map:map();

for $character in json:array-values(map:get(xdmp:from-json(fn:string(fn:doc("/data.json"))),"result"))
let $id := map:get($character, "id")
let $children := 
          for $child in json:array-values(map:get($character,'children'))
          return
            element sem:triple {
              element sem:subject {$id},
              element sem:predicate {"/fictional_universe/character_child"},
              element sem:object {map:get($child,'id')}
            }
let $parents := 
          for $parent in json:array-values(map:get($character,'parents'))
          return
            element sem:triple {
              element sem:subject {$id},
              element sem:predicate {"/fictional_universe/character_parent"},
              element sem:object {map:get($parent,'id')}
            }
let $ranks := 
          for $rank in json:array-values(map:get($character,'rank'))
          let $rank-id := map:get($rank,'id')
          return (
            map:put($misc-map,$rank-id,map:get($rank,'name')),
            element sem:triple {
              element sem:subject {$id},
              element sem:predicate {"/fictional_universe/character_rank"},
              element sem:object {$rank-id}
            }
          )
let $birth-place := 
          for $place_of_birth in map:get($character,'place_of_birth')
          let $place_of_birth-id := map:get($place_of_birth,'id')
          return (
            map:put($misc-map,$place_of_birth-id,map:get($place_of_birth,'name')),
            element sem:triple {
              element sem:subject {$id},
              element sem:predicate {"/fictional_universe/character_place_of_birth"},
              element sem:object {$place_of_birth-id}
            }
          )
let $romance := 
          for $item in json:array-values(map:get($character,'romantically_involved_with')),
              $subitem in json:array-values(map:get($item,'partner'))
          let $subitem-id := map:get($subitem,'id')
          where $subitem-id ne $id
          return (
            element sem:triple {
              element sem:subject {$id},
              element sem:predicate {"/fictional_universe/character_romantically_involved_with"},
              element sem:object {$subitem-id}
            }
          )
let $siblings := 
          for $item in json:array-values(map:get($character,'siblings')),
              $subitem in json:array-values(map:get($item,'siblings'))
          let $subitem-id := map:get($subitem,'id')
          where $subitem-id ne $id
          return (
            element sem:triple {
              element sem:subject {$id},
              element sem:predicate {"/fictional_universe/character_sibling"},
              element sem:object {$subitem-id}
            }
          )
let $species := 
          for $item in json:array-values(map:get($character,'species'))
          let $item-id := map:get($item,'id')
          return (
            map:put($misc-map,$item-id,map:get($item,'name')),
            element sem:triple {
              element sem:subject {$id},
              element sem:predicate {"/fictional_universe/character_species"},
              element sem:object {$item-id}
            }
          )
let $gender := 
          for $item in json:array-values(map:get($character,'gender'))
          let $item-id := map:get($item,'id')
          return (
            map:put($misc-map,$item-id,map:get($item,'name')),
            element sem:triple {
              element sem:subject {$id},
              element sem:predicate {"/fictional_universe/character_gender"},
              element sem:object {$item-id}
            }
          )
let $organizations := 
          for $item in json:array-values(map:get($character,'organizations'))
          let $item-id := map:get($item,'id')
          return (
            map:put($misc-map,$item-id,map:get($item,'name')),
            element sem:triple {
              element sem:subject {$id},
              element sem:predicate {"/fictional_universe/fictional_organization"},
              element sem:object {$item-id}
            }
          )
return
  xdmp:document-insert(
    $id||".xml",
    element sem:triples {
      attribute uri {$id},
      element sem:triple {
        element sem:subject {$id},
        element sem:predicate {"name"},
        element sem:object {map:get($character,"name")}
      },
      $gender,
      $species,
      $organizations,
      $parents,
      $siblings,
      $children,
      $ranks,
      $birth-place,
      $romance
    }
  ),
  for $key in map:keys($misc-map)
  let $name := map:get($misc-map,$key)
  return
   xdmp:document-insert(
     $key||".xml",
     element sem:triples {
        attribute uri {$key},
        element sem:triple {
        element sem:subject {$key},
        element sem:predicate {"name"},
        element sem:object {$name}
      }
    }
  )
  ;
  xquery version "1.0-ml";

  import module namespace sem = "http://marklogic.com/semantics" 
        at "/MarkLogic/semantics.xqy";
  declare variable $query-options as xs:string+ := ("stemmed","case-insensitive","whitespace-insensitive", "punctuation-insensitive","diacritic-insensitive");

  for $resource in /sem:triples
  let $uri := $resource/@uri
  let $name := $resource/sem:triple[sem:predicate eq "name"]/sem:object
  return 
    xdmp:document-insert(
      "/resources"||$uri||".xml",
      element resource {
        $uri,
        element reverse-query{
          cts:word-query(fn:string($name),$query-options)
        },
        element phrase {fn:string($name)}
      }
    ),
  for $predicate in fn:distinct-values(/sem:triples/sem:triple/sem:predicate)
  let $name := fn:replace(fn:replace(fn:tokenize($predicate,"/")[fn:last()],"^character_",""),"[_-]+"," ")
  return 
      xdmp:document-insert(
      "/predicates"||$predicate||".xml",
      element predicate {
        attribute uri {$predicate},
        element reverse-query{
          cts:word-query(fn:string($name),$query-options)
        },
        element phrase {fn:string($name)}
      }
    )