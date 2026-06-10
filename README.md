This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Impresión de tickets

La función se activa desde **Configuración → Funciones → Impresión de tickets** (feature flag `tickets`, apagado por default). Con el flag encendido, el checkout del POS y el detalle de pedido ofrecen:

- **Ticket térmico 80 mm** — se imprime desde el navegador (`window.print()` sobre un iframe aislado). Funciona con cualquier impresora térmica con driver instalado.
- **Ticket carta (PDF)** — lo genera el backend con el logo y datos del negocio (Configuración → Datos del negocio); se abre en una pestaña para imprimir o compartir.

### Impresión silenciosa en la caja (sin diálogo)

Para que el ticket térmico salga directo a la impresora sin el diálogo de impresión:

1. Configura la impresora térmica 80 mm como **impresora predeterminada** del sistema.
2. Lanza Chrome/Chromium con la flag `--kiosk-printing`:

   ```bash
   # macOS
   open -na "Google Chrome" --args --kiosk-printing https://pos.ejemplo.mx
   # Windows (acceso directo)
   chrome.exe --kiosk-printing https://pos.ejemplo.mx
   ```

Con esa flag, `window.print()` imprime de inmediato a la impresora predeterminada. Sin ella, aparece el diálogo nativo (un clic extra por venta).
