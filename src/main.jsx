import { createRoot } from "react-dom/client";
import { RouterProvider } from "./router";
import { AuthProvider, CartProvider, ToastProvider } from "./state";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <ToastProvider>
    <AuthProvider>
      <CartProvider>
        <RouterProvider>
          <App />
        </RouterProvider>
      </CartProvider>
    </AuthProvider>
  </ToastProvider>
);
