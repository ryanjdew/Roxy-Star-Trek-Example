xquery version "1.0-ml";
(: 
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
:)

module namespace extsuggest = "http://marklogic.com/rest-api/resource/extsuggest";

import module namespace config-query = "http://marklogic.com/rest-api/models/config-query" at "/MarkLogic/rest-api/models/config-query-model.xqy";
import module namespace search = "http://marklogic.com/appservices/search" at "/MarkLogic/appservices/search/search.xqy";

declare default function namespace "http://www.w3.org/2005/xpath-functions";
declare option xdmp:mapping "false";

declare function extsuggest:get(
    $context as map:map,
    $params  as map:map
) as document-node()*
{
    let $output-types := map:put($context,"output-types","application/json")
    let $pqtxt := map:get($params,"pqtxt")
    let $options := config-query:get-options("all")
    let $content :=
        if (exists($pqtxt))
        then json:to-array(search:suggest($pqtxt, $options))
        else json:array()
    let $response := json:object()
    let $_ := map:put($response, "suggestions", $content)
    return (xdmp:set-response-code(200,"OK"), document { xdmp:to-json($response) })
};
