# Powered Shopping

5-Minute Classroom Speaking Script  
Presentation Script for Class Demonstration

## 1. Introduction

Good morning everyone. My project is **Powered Shopping**. It is an AI-driven shopping assistant designed to make online shopping more natural, interactive, and efficient. Instead of depending only on manual browsing, the user can also speak or type commands such as showing products under a certain price, asking for recommendations, adding items to the cart, or moving directly to checkout.

## 2. Problem Statement

The problem I focused on is that traditional online shopping is still very manual. Users usually have to type product names, apply filters again and again, open product pages, and manually manage the cart. This takes time and makes the experience less interactive. I wanted to solve this by building a voice-first shopping interface supported by AI.

## 3. Proposed Solution

My solution is a full-stack application where users can sign in securely, browse products, and interact with the shopping system through voice or text. The assistant can understand shopping-related commands and trigger real actions such as product search, recommendations, add to cart, remove from cart, and checkout. So this is not just a chatbot that replies with text. It is connected to the actual shopping flow of the application.

## 4. How Users Use the Application

The user journey is simple. First, the user logs in through email and password or Google sign-in. After login, the user enters the dashboard. From there, the user can browse products manually or use the assistant. For example, the user can say: show Nike shoes under 2000. The app then displays matching products. The user can add one of them to the cart, review the total, and move to checkout. In this way, the shopping flow becomes faster and more guided.

## 5. How the Project Works Internally

Internally, the system follows a clear flow. The user first gives input either by microphone or by typing. The frontend captures that input and sends it to the backend. The backend then decides which service should handle the request. If AI mode is available, the assistant can use tool-calling to perform real shopping actions. If AI mode is not available, the project has a fallback parser that still handles common commands. After processing, the backend sends back both a response message and structured UI data. The frontend then updates products, recommendations, cart, or checkout state instantly.

## 6. Technology Stack

For the frontend, I used **React 18** and **Vite 5** because they are fast and suitable for building interactive user interfaces. For the backend, I used **Node.js** and **Express 4** to create the API layer and business logic. For authentication, I used **Firebase Authentication** with support for email/password and Google sign-in. For AI features, I used the **OpenAI API**. The chat model is used for assistant behavior and tool-calling, while the transcription model is used for fallback voice recording. For product data, I used **FakeStore API** and also kept a **local mock JSON dataset** as backup.

## 7. Main Features

The key features of the project are:
- secure login system
- voice command input
- manual text command input
- smart product search and filtering
- recommendations for trending and similar products
- cart operations and checkout simulation
- conversation history
- fallback logic for reliability

These features make the application more complete than a simple prototype.

## 8. What Makes the Project Special

The most important strength of this project is reliability through fallback design. If browser speech recognition fails, the user can still record a voice command and send it for transcription. If the AI assistant is unavailable, the local intent parser still handles common actions. If Firestore is not configured, cart operations continue in memory. If the remote product API fails, local mock products are used. This makes the project much safer for live demo situations and shows good engineering design.

## 9. Live Demo Plan

In the live demo, I will show a simple flow. First, I will log in. Then I will search for a product using voice or typed input. After that, I will add an item to the cart, open the cart, and finally show the checkout flow. This demo will prove that the project works end to end and is not only focused on the interface or only on AI.

## 10. Conclusion

To conclude, Powered Shopping is a full-stack AI-based shopping assistant that combines frontend design, backend APIs, authentication, voice interaction, and fallback-aware engineering. The project solves a real usability problem in e-commerce by making shopping more natural and interactive. It also demonstrates practical use of Generative AI APIs in a domain-specific application.

Thank you. I can now show the demo or answer questions about the project architecture, technologies used, or future improvements.
