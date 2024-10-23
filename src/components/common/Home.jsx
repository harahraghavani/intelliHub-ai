"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import FormInput from "../form/FromInput";
import { ROLE_ASSISTANT, ROLE_USER } from "@/constant/appConstant";

import { PiCopySimple } from "react-icons/pi";
import { HiMiniCheck } from "react-icons/hi2";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism";
import { HiOutlineSparkles } from "react-icons/hi2";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Box,
  Container,
  Flex,
  Text,
  VStack,
  IconButton,
  useColorMode,
} from "@chakra-ui/react";

import { generateStreamedTextData } from "@/server/server";
import { readStreamableValue } from "ai/rsc";
import { useChatMessages } from "@/hooks/messages/useChatMessages";

const Home = () => {
  const chatEndRef = useRef(null);

  const { colorMode } = useColorMode();
  const [isCopied, setIsCopied] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const { messages, setMessages } = useChatMessages();
  const [isStreamComplete, setIsStreamComplete] = useState(null);

  // react hook form
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  const inputValue = watch("promptInput");

  const customMarkdownTheme = {
    p: (props) => {
      const { children } = props;
      return <Text mb={4}>{children}</Text>; // Adds margin-bottom to paragraphs
    },
    h1: (props) => {
      const { children } = props;
      return (
        <Text fontSize="2xl" mb={4}>
          {children}
        </Text>
      );
    },
    ul: (props) => {
      const { children } = props;
      return (
        <Box as="ul" styleType="disc" pl={4} mb={4}>
          {children}
        </Box>
      );
    },
    ol: (props) => {
      const { children } = props;
      return (
        <Box as="ol" styleType="decimal" pl={4} mb={4}>
          {children}
        </Box>
      );
    },
    li: (props) => {
      const { children } = props;
      return (
        <Box
          as="li"
          mb={2}
          sx={{
            "&::marker": {
              marginInlineStart: "8px", // Adjust this value to set the margin for the list markers (1., 2., 3., etc.)
            },
          }}
        >
          {children}
        </Box>
      );
    },
    pre: (props) => {
      const { children } = props;
      return (
        <Box
          as="pre"
          mb={5}
          overflowX="auto" // Allow horizontal scrolling
          overflowY="hidden" // Hide vertical scrollbar if unnecessary
          whiteSpace="pre" // Prevent wrapping, maintaining the original format
        >
          {children}
        </Box>
      );
    },

    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <Box className="code-box" width="100%" overflowX="auto">
          <SyntaxHighlighter
            style={okaidia}
            language={match[1]}
            PreTag="div"
            customStyle={{ borderRadius: "0.375rem", marginTop: 0 }}
            children={String(children).replace(/\n$/, "")}
            {...props}
          />
        </Box>
      ) : (
        <Box
          as="code"
          color={colorMode === "dark" ? "yellow.300" : "purple.500"}
          bg={colorMode === "dark" ? "gray.700" : "gray.100"}
          p={1}
          width={"100%"}
          overflowX="auto"
          borderRadius="md"
          {...props}
        >
          {children}
        </Box>
      );
    },
  };

  const handleCopy = (text, index) => {
    // Check if the text is a code block
    const isCodeBlock = text.startsWith("```") && text.endsWith("```");

    let plainText;
    if (isCodeBlock) {
      // For code blocks, remove the backticks and language identifier
      plainText = text
        .replace(/^```[\w-]*\n/, "") // Remove opening ```language
        .replace(/```$/, "") // Remove closing ```
        .trim();
    } else {
      // For regular text, remove Markdown formatting
      plainText = text
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
        .replace(/\*(.*?)\*/g, "$1") // Remove italic
        .replace(/\[(.*?)\]$$.*?$$/g, "$1") // Remove links
        .replace(/^#+\s/gm, "") // Remove heading markers
        .replace(/^[-*+]\s/gm, "") // Remove list item markers
        .trim();
    }

    navigator.clipboard.writeText(plainText).then(() => {
      setSelectedIndex(index);
      setIsCopied(true);
      // Revert back to copy icon after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
        setSelectedIndex(null);
      }, 2000);
    });
  };

  const handleSendMessage = async () => {
    setIsStreamComplete(false);
    const newUserMessage = { role: ROLE_USER, content: inputValue };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);

    // Start with an empty assistant message
    const newAssistantMessage = {
      role: ROLE_ASSISTANT,
      content: "",
      isLoading: true,
    };
    setMessages((prevMessages) => [...prevMessages, newAssistantMessage]);

    // Start loading state

    setValue("promptInput", "");
    const { output } = await generateStreamedTextData({
      messages: [...messages, newUserMessage],
    });

    let fullContent = "";
    for await (const delta of readStreamableValue(output)) {
      fullContent += delta;

      // Update the last message (assistant's message) with the new content
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = {
          ...updatedMessages[updatedMessages.length - 1],
          content: fullContent,
          isLoading: false,
        };
        return updatedMessages;
      });
    }
    setIsStreamComplete(true);
  };

  // Auto-scroll to the latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <Container
      maxWidth={{
        base: "90%",
        md: "2xl",
      }}
      display="flex"
      flexDirection="column"
      overflow={"hidden"}
      padding={0}
    >
      <Flex direction="column" height="calc(100vh - 80px)" width={"100%"}>
        <Flex flex={1} direction="column" overflow="hidden">
          <Box
            flex={1}
            overflowY="auto"
            px={{
              base: 0,
              md: 0,
            }}
            py={4}
            sx={{
              "&::-webkit-scrollbar": {
                display: "none",
              },
              "-ms-overflow-style": "none",
              "scrollbar-width": "none",
            }}
          >
            <VStack align="stretch" mx={0} width="100%">
              {messages &&
                messages.length > 0 &&
                messages?.map((msg, index) => {
                  return (
                    <Fragment key={msg.text}>
                      <Flex
                        key={index}
                        align={
                          msg.role === ROLE_USER ? "flex-end" : "flex-start"
                        }
                        direction="column"
                        w="full"
                        mb={msg.role === ROLE_USER ? 8 : 0}
                      >
                        <Flex
                          align="unset"
                          gap={msg.role === ROLE_USER ? 0 : 4}
                          width={msg.role === ROLE_USER ? "unset" : "100%"}
                        >
                          {msg.role === ROLE_ASSISTANT && (
                            <Box>
                              <HiOutlineSparkles size={30} />
                            </Box>
                          )}
                          <Box
                            bg={
                              msg.role === ROLE_USER
                                ? colorMode === "light"
                                  ? "gray.200"
                                  : "gray.600"
                                : colorMode === "light"
                                ? ""
                                : ""
                            }
                            px={msg.role === ROLE_USER ? 4 : 0}
                            py={msg.role === ROLE_USER ? 2.5 : 0}
                            borderRadius="lg"
                            transition="background 0.3s ease-in"
                            width={"100%"}
                            overflow={"auto"}
                          >
                            {msg.role === ROLE_ASSISTANT ? (
                              msg.isLoading ? (
                                <Text>Intellihub is thinking...</Text>
                              ) : (
                                <Markdown
                                  components={customMarkdownTheme}
                                  rehypePlugins={[[remarkGfm]]}
                                >
                                  {msg.content}
                                </Markdown>
                              )
                            ) : (
                              <Text whiteSpace="pre-wrap">{msg.content}</Text>
                            )}
                          </Box>
                        </Flex>
                        {msg.role === ROLE_ASSISTANT &&
                          !msg.isLoading &&
                          isStreamComplete && (
                            <Box>
                              {isCopied && selectedIndex === index ? (
                                <IconButton
                                  bg="transparent"
                                  icon={<HiMiniCheck size={20} />}
                                  _hover={{ bg: "transparent" }}
                                  _active={{ bg: "transparent" }}
                                  _focusVisible={{
                                    bg: "transparent",
                                    outline: "none",
                                  }}
                                  cursor="default"
                                />
                              ) : (
                                <IconButton
                                  bg="transparent"
                                  icon={<PiCopySimple size={20} />}
                                  _hover={{ bg: "transparent" }}
                                  _active={{ bg: "transparent" }}
                                  _focusVisible={{
                                    bg: "transparent",
                                    outline: "none",
                                  }}
                                  onClick={() => handleCopy(msg.content, index)}
                                />
                              )}
                            </Box>
                          )}
                      </Flex>
                    </Fragment>
                  );
                })}
              <div ref={chatEndRef} />
            </VStack>
          </Box>
        </Flex>
        <Box as="footer" py={4}>
          <FormInput
            name="promptInput"
            id="promptInput"
            register={register}
            errors={errors}
            rules={{}}
            placeHolderText="Message IntelliHub"
            sendOnClick={handleSendMessage}
            btnDisabled={!inputValue}
          />
        </Box>
      </Flex>
    </Container>
  );
};

export default Home;
