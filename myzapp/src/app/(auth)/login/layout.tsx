// src/app/login/layout.tsx

import { LoginJsonLd } from "./jsonId";

   
   export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
     return (
       <>
         <LoginJsonLd />
         {children}
       </>
     );
   }