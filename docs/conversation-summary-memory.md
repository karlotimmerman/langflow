### ⛓️LangFlow example:
![Description](img/conversation-summary-memory.png#only-dark)
![Description](img/conversation-summary-memory.png#only-light)

[Get JSON file](data/Conversation-summary-memory.json){: .md-button download="Conversation-summary-memory"} 

## Nodes

We used `ChatOpenAI` as the LLM, but you can use any LLM that has an API. Make sure to get the API key from the LLM provider. For example, [ChatOpenAI](https://platform.openai.com/){.internal-link target=_blank} requires you to create an account to get your API key.

Check the short tutorial of [ChatOpenAI](llms.md#chatopenai){.internal-link target=_blank} options available.

`ConversationSummaryMemory`, a memory of this type creates a summary of the conversation over time, which can be useful for condensing information. The **memory key** input is typically generated by encoding the input text using an encoder network, which maps the input text into a fixed-dimensional vector representation. We used **history** as *default*.

`ConversationChain` is a chain to have a conversation and load context from memory. **Output Key** and **Input Key** are simply unique identifiers used to represent the data being passed between different modules or steps in a Conversation Chain. These keys help to ensure that the data is properly routed and processed by the appropriate modules in the conversation flow.

Output Key used the default: ``` response ``` and Input Key used the default: ``` input ```.