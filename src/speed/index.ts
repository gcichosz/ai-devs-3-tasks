// TODO: Define constants for API endpoints (rafal.ag3nts.org)
// TODO: Define interface types for API responses

// TODO: Step 1 - Send initial request with password "NONOMNISMORIAR" to get hash

// TODO: Step 2 - Send hash in "sign" field to get:
//       - timestamp
//       - signature
//       - two URLs with challenges

// TODO: Step 3 - Create function to fetch and process challenge URLs in parallel
//       - Fetch both URLs simultaneously
//       - Extract "data" and "task" fields
//       - Process according to task instructions
//       - Return results in Polish

// TODO: Step 4 - Create function to combine results from both challenges

// TODO: Step 5 - Create main function that:
//       - Gets initial hash
//       - Gets challenge URLs
//       - Solves challenges
//       - Sends final response with:
//         {
//           apikey: string,
//           timestamp: number,
//           signature: string,
//           answer: string | any
//         }

// TODO: Add error handling and timeout management (6 second limit)

const main = async () => {};

main();
