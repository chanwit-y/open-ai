import OpenAI from "openai";
import { encoding_for_model } from "tiktoken";

const MAX_TOKEN = 700;
const MODEL = "gpt-3.5-turbo";

const client = new OpenAI();

const encoder = encoding_for_model(MODEL);

const context: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{
	role: "system",
	content: "You are a helpful chatbot"
}]



function getContextLength() {
	let length = 0;
	context.forEach((msg) => {
		if(typeof msg.content === "string") {
			length += encoder.encode(msg.content).length;
		} else if (Array.isArray(msg.content)) {
			msg.content.forEach((msg) => {
				if(msg.type === "text") {
					length += encoder.encode(msg.text).length;
				}
			})
		}
	})
	return length;
}

function deleteOlderMessage() {
	let contextLength = getContextLength();
	while (contextLength > MAX_TOKEN) {
		for(let i = 0; i < context.length; i++) {
			const msg = context[i];
			if(msg.role !== "system") {
				context.splice(i, 1);
				contextLength = getContextLength();
				console.log(`New context length: ${contextLength}` )
				break;
			}
		}
	}
}

async function crateChatCompletion() {
	const res = await client.chat.completions.create({
		model: MODEL,
		messages: context,
	});
	const resMsg = res.choices[0].message;
	context.push(resMsg)

	if(res.usage && res.usage.total_tokens > MAX_TOKEN) {
		deleteOlderMessage()
	}

	console.log(`${res.choices[0].message.role}: ${res.choices[0].message.content}`);
}


process.stdin.addListener("data", async (data) => {
	const input = data.toString().trim();
	if (input === "exit") {
		process.exit(0);
	}
	context.push({
		role: "user",
		content: input,
	});
	await crateChatCompletion();
	console.log("Assistant:", context[context.length - 1].content);
});
