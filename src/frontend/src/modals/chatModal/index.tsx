import { Dialog, Transition } from "@headlessui/react";
import { LockClosedIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { Fragment, useContext, useEffect, useRef, useState } from "react";
import { PopUpContext } from "../../contexts/popUpContext";
import { FlowType, NodeType } from "../../types/flow";
import { TabsContext } from "../../contexts/tabsContext";
import { alertContext } from "../../contexts/alertContext";
import { classNames, snakeToNormalCase } from "../../utils";
import { typesContext } from "../../contexts/typesContext";
import ChatMessage from "./chatMessage";
import { FaEraser } from "react-icons/fa";
import { sendAllProps } from "../../types/api";
import { ChatMessageType, ChatType } from "../../types/chat";
import ChatInput from "./chatInput";

const _ = require("lodash");

export default function ChatModal({
	flow,
	open,
	setOpen,
}: {
	open: boolean;
	setOpen: Function;
	flow: FlowType;
}) {
	const { updateFlow } = useContext(TabsContext);
	const [chatValue, setChatValue] = useState("");
	const [chatHistory, setChatHistory] = useState<ChatMessageType[]>([]);
	const { reactFlowInstance } = useContext(typesContext);
	const { setErrorData, setNoticeData } = useContext(alertContext);
	const [ws, setWs] = useState<WebSocket | null>(null);
	const [lockChat, setLockChat] = useState(false);
	const addChatHistory = (
		message: string,
		isSend: boolean,
		thought?: string,
		files?: Array<any>
	) => {
		setChatHistory((old) => {
			let newChat = _.cloneDeep(old);
			if (files) {
				newChat.push({ message, isSend, files });
			} else if (thought) {
				newChat.push({ message, isSend, thought });
			} else {
				newChat.push({ message, isSend });
			}
			return newChat;
		});
	};

	useEffect(() => {
		const newWs = new WebSocket(`ws://127.0.0.1:5003/chat/${flow.id}`);
		newWs.onopen = () => {
			console.log("WebSocket connection established!");
		};
		newWs.onmessage = (event) => {
			const data = JSON.parse(event.data);
			console.log("Received data:", data);
			//get chat history
			if (Array.isArray(data)) {
				console.log(data);

				setChatHistory((_) => {
					let newChatHistory: ChatMessageType[] = [];
					data.forEach(
						(chatItem: {
							intermediate_steps?: "string";
							is_bot: boolean;
							message: string;
							type: string;
							files?: Array<any>;
						}) => {
							if (chatItem.message) {
								newChatHistory.push(
									chatItem.files
										? {
												isSend: !chatItem.is_bot,
												message: chatItem.message,
												thought: chatItem.intermediate_steps,
												files: chatItem.files,
										  }
										: {
												isSend: !chatItem.is_bot,
												message: chatItem.message,
												thought: chatItem.intermediate_steps,
										  }
								);
							}
						}
					);
					return newChatHistory;
				});
			}
			if (data.type === "end") {
				if (data.files) {
					addChatHistory(
						data.message,
						false,
						data.intermediate_steps,
						data.files
					);
				} else {
					addChatHistory(data.message, false, data.intermediate_steps);
				}
				setLockChat(false);
			}
			if (data.type == "file") {
				console.log(data);
			}
			// Do something with the data received from the WebSocket
		};
		newWs.onclose = (e) => {
			console.log("close");
			setLockChat(false);
		};
		newWs.onerror = (e) => {
			window.alert("error");
		};
		setWs(newWs);

		return () => {
			newWs.close();
		};
	}, []);

	async function sendAll(data: sendAllProps) {
		if (ws) {
			ws.send(JSON.stringify(data));
		}
	}

	useEffect(() => {
		if (ref.current) ref.current.scrollIntoView({ behavior: "smooth" });
	}, [chatHistory]);

	useEffect(() => {
		if (ws &&ws.readyState===ws.CLOSED) {
			setLockChat(false);
		}
	}, [lockChat]);

	function validateNode(n: NodeType): Array<string> {
		if (!n.data?.node?.template || !Object.keys(n.data.node.template)) {
			setNoticeData({
				title:
					"We've noticed a potential issue with a node in the flow. Please review it and, if necessary, submit a bug report with your exported flow file. Thank you for your help!",
			});
			return [];
		}

		const {
			type,
			node: { template },
		} = n.data;

		return Object.keys(template).reduce(
			(errors: Array<string>, t) =>
				errors.concat(
					template[t].required &&
						template[t].show &&
						(!template[t].value || template[t].value === "") &&
						!reactFlowInstance
							.getEdges()
							.some(
								(e) =>
									e.targetHandle.split("|")[1] === t &&
									e.targetHandle.split("|")[2] === n.id
							)
						? [
								`${type} is missing ${
									template.display_name
										? template.display_name
										: snakeToNormalCase(template[t].name)
								}.`,
						  ]
						: []
				),
			[] as string[]
		);
	}

	function validateNodes() {
		return reactFlowInstance
			.getNodes()
			.flatMap((n: NodeType) => validateNode(n));
	}

	const ref = useRef(null);

	function sendMessage() {
		if (chatValue !== "") {
			let nodeValidationErrors = validateNodes();
			if (nodeValidationErrors.length === 0) {
				setLockChat(true);
				let message = chatValue;
				setChatValue("");
				addChatHistory(message, true);

				sendAll({
					...reactFlowInstance.toObject(),
					message,
					chatHistory,
					name: flow.name,
					description: flow.description,
				});
			} else {
				setErrorData({
					title: "Oops! Looks like you missed some required information:",
					list: nodeValidationErrors,
				});
			}
		} else {
			setErrorData({
				title: "Error sending message",
				list: ["The message cannot be empty."],
			});
		}
	}
	function clearChat() {
		setChatHistory([]);
		ws.send(JSON.stringify({ clear_history: true }));
	}

	const { closePopUp } = useContext(PopUpContext);
	function setModalOpen(x: boolean) {
		setOpen(x);
		if (x === false) {
			setTimeout(() => {
				closePopUp();
			}, 300);
		}
	}
	return (
		<Transition.Root show={open} appear={true} as={Fragment}>
			<Dialog
				as="div"
				className="relative z-10"
				onClose={setModalOpen}
				initialFocus={ref}
			>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black backdrop-blur-sm dark:bg-gray-600 dark:bg-opacity-80 bg-opacity-80 transition-opacity" />
				</Transition.Child>

				<div className="fixed inset-0 z-10 overflow-y-auto">
					<div className="flex h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
							enterTo="opacity-100 translate-y-0 sm:scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 translate-y-0 sm:scale-100"
							leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
						>
							<Dialog.Panel className=" drop-shadow-2xl relative flex flex-col justify-between transform h-[95%] overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 w-[690px]">
								<div className="relative w-full">
									<button
										onClick={() => clearChat()}
										className="absolute top-2 right-2 hover:text-red-500"
									>
										<FaEraser className="w-4 h-4" />
									</button>
								</div>
								<div className="w-full h-full bg-white dark:bg-gray-800 border-t dark:border-t-gray-600 flex-col flex items-center overflow-scroll scrollbar-hide">
									{chatHistory.map((c, i) => (
										<ChatMessage chat={c} key={i} />
									))}
									<div ref={ref}></div>
								</div>
								<div className="w-full bg-white dark:bg-gray-800 border-t dark:border-t-gray-600 flex-col flex items-center justify-between p-3">
									<div className="relative w-full mt-1 rounded-md shadow-sm">
										<ChatInput
											chatValue={chatValue}
											lockChat={lockChat}
											sendMessage={sendMessage}
											setChatValue={setChatValue}
										/>
									</div>
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition.Root>
	);
}