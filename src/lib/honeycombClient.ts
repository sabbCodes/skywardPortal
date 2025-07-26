import createEdgeClient from "@honeycomb-protocol/edge-client";

const API_URL = "https://edge.test.honeycombprotocol.com/";

export const honeycombClient = createEdgeClient(API_URL, true);

export const PROJECT_ID = "7ovRwhnZAbP2vZ2FxmmmL14KR5eAvR4o1Q5p8q6nifjQ";
