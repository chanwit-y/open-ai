import OpenAI from "openai";

const openAi = new OpenAI();

function getTimeOfDay() {
  return "5:45";
}

function getOrderStatus(prderId: string) {
  console.log(`Order status for ${prderId}`);
  const orderAsNumber = parseInt(prderId);
  if (orderAsNumber % 2 === 0) {
    return "Order is being processed";
  }
  return "Order is being shipped";
}

async function callOpenAIWithTools() {
  const context: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant that gives information about the time of day and order status.",
    },
    //     {
    //       role: "user",
    //       content: "What is the time of day?",
    //     },
    {
      role: "user",
      content: "What is the order status for order id 12345757?",
    },
  ];

  const res = await openAi.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: context,
    tools: [
      {
        type: "function",
        function: {
          name: "getTimeOfDay",
          description: "Get the current time of day",
        },
      },
      {
        type: "function",
        function: {
          name: "getOrderStatus",
          description: "Get the order status",
          parameters: {
            type: "object",
            properties: {
              orderId: {
                type: "string",
                description: "The order id",
              },
            },
            required: ["orderId"],
          },
        },
      },
    ],
    tool_choice: "auto",
  });

  const willInvoikeFunction = res.choices[0].finish_reason === "tool_calls";
  const toolCall = res.choices[0].message.tool_calls![0];

  if (willInvoikeFunction) {
    const toolName = toolCall.function.name;

    if (toolName === "getTimeOfDay") {
      const toolRes = getTimeOfDay();
      context.push(res.choices[0].message);
      context.push({
        role: "tool",
        content: toolRes,
        // name: toolName,
        tool_call_id: toolCall.id,
      });
    }

    if (toolName === "getOrderStatus") {
      const rawArgument = toolCall.function.arguments;
      const parsedArgument = JSON.parse(rawArgument);
      const toolRes = getOrderStatus(parsedArgument.orderId);

      context.push(res.choices[0].message);
      context.push({
        role: "tool",
        content: toolRes,
        // name: toolName,
        tool_call_id: toolCall.id,
      });
    }
  }

  const secondRes = await openAi.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: context,
  });

  console.log(secondRes.choices[0].message.content);

  //   console.log(res.choices[0].message.content);
}

await callOpenAIWithTools();
