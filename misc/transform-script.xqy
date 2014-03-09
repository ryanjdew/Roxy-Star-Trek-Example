import module namespace sem = "http://marklogic.com/semantics" 
      at "/MarkLogic/semantics.xqy";
declare namespace http = "xdmp:http";
declare variable $misc-map := map:map();
declare variable $query-options as xs:string+ := ("stemmed","case-insensitive","whitespace-insensitive", "punctuation-insensitive","diacritic-insensitive");

for $character in json:array-values(map:get(xdmp:from-json(fn:string(fn:doc("/data.json"))),"result"))
let $id := map:get($character, "id")
let $mid := map:get($character, "mid")
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
            map:put($misc-map,$rank-id,$rank),
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
            map:put($misc-map,$place_of_birth-id,$place_of_birth),
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
let $image := 
                    for $item in map:get($character,'/common/topic/image')
                    let $subitem-id := map:get($item,'mid')
                    where $subitem-id ne $id
                    return (
                      element sem:triple {
                        element sem:subject {$id},
                        element sem:predicate {"/common/topic/image"},
                        element sem:object {$subitem-id}
                      }
                    )
let $species := 
          for $item in json:array-values(map:get($character,'species'))
          let $item-id := map:get($item,'id')
          return (
            map:put($misc-map,$item-id,$item),
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
            map:put($misc-map,$item-id,$item),
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
            map:put($misc-map,$item-id,$item),
            element sem:triple {
              element sem:subject {$id},
              element sem:predicate {"/fictional_universe/fictional_organization"},
              element sem:object {$item-id}
            }
          )
let $description := 
          let $call := xdmp:http-get("https://www.googleapis.com/freebase/v1/topic"||$mid||"?filter=/common/topic/description")
          where $call/http:code eq 200
          return
            let $json := 
              map:get(map:get(map:get(xdmp:from-json($call[2]),"property"),"/common/topic/description"),"values")
            return
              element sem:triple {
                element sem:subject {$id},
                element sem:predicate {"/common/topic/description"},
                element sem:object {map:get(json:array-values($json)[map:get(.,"lang") eq "en"][1],"value")}
              }
let $name := map:get($character,"name")
return
  xdmp:document-insert(
    "/resources"||$id||".xml",
    element resource {
      attribute uri {$id},
      element meta {
        element sem:triples {
          element sem:triple {
            element sem:subject {$id},
            element sem:predicate {"name"},
            element sem:object {$name}
          },
          $image,
          $gender,
          $species,
          $organizations,
          $parents,
          $siblings,
          $children,
          $ranks,
          $birth-place,
          $romance,
          $description
        },
        element reverse-query{
          cts:word-query(fn:string($name),$query-options)
        }
      },
      element name {$name},
      element birth-place {
        map:get(map:get($misc-map,$birth-place/sem:object/fn:string()),"name")
      },
      element gender {
        map:get(map:get($misc-map,$gender/sem:object/fn:string()),"name")
      },
      element various-species {
        $species ! element species {map:get(map:get($misc-map,./sem:object/fn:string()),"name")}
      },
      element organizations {
        $organizations ! element organization {map:get(map:get($misc-map,./sem:object/fn:string()),"name")}
      },
      element ranks {
        $ranks ! element rank {map:get(map:get($misc-map,./sem:object/fn:string()),"name")}
      },
      element description {
        $description/sem:object/fn:string()
      }
    }
  ),
  for $key in map:keys($misc-map)
  let $item := map:get($misc-map,$key)
  let $name := map:get($item,'name')
  let $mid := map:get($item,'mid')
  let $description := 
          let $call := xdmp:http-get("https://www.googleapis.com/freebase/v1/topic"||$mid||"?filter=/common/topic/description")[2]
          where $call/http:code eq 200
          return
            let $json := 
              map:get(map:get(map:get(xdmp:from-json($call[2]),"property"),"/common/topic/description"),"values")
            return
              element sem:triple {
                element sem:subject {$key},
                element sem:predicate {"/common/topic/description"},
                element sem:object {map:get(json:array-values($json)[map:get(.,"lang") eq "en"][1],"value")}
              }
  return
   xdmp:document-insert(
     "/resources"||$key||".xml",
     element resource {
       attribute uri {$key},
       element meta {
         element sem:triples {
           element sem:triple {
             element sem:subject {$key},
             element sem:predicate {"name"},
             element sem:object {$name}
           },
           $description
         },
         element reverse-query{
           cts:word-query(fn:string($name),$query-options)
         }
       },
       element name {$name},
       element description {
         $description/sem:object/fn:string()
       }
     }
  )
  ;
  xquery version "1.0-ml";

  import module namespace sem = "http://marklogic.com/semantics" 
        at "/MarkLogic/semantics.xqy";
  declare variable $query-options as xs:string+ := ("stemmed","case-insensitive","whitespace-insensitive", "punctuation-insensitive","diacritic-insensitive");

  for $predicate in fn:distinct-values(/resource/meta/sem:triples/sem:triple/sem:predicate)
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