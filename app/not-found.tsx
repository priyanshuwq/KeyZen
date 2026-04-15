import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "404 — KeyZen",
  description: "Page not found.",
}

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        {/* Animated keyboard SVG */}
        <svg
          viewBox="0 0 400 300"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-8 w-full max-w-sm"
          role="img"
          aria-labelledby="notfound-title notfound-desc"
        >
          <title id="notfound-title">Page not found</title>
          <desc id="notfound-desc">
            An animated keyboard with floating 404 keys
          </desc>

          {/* Keyboard base */}
          <rect
            x="40"
            y="160"
            width="320"
            height="110"
            rx="12"
            className="fill-secondary stroke-border"
            strokeWidth="1.5"
          />

          {/* Keyboard rows */}
          {/* Row 1 */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <rect
              key={`r1-${i}`}
              x={62 + i * 32}
              y="175"
              width="26"
              height="22"
              rx="4"
              className="fill-muted stroke-border"
              strokeWidth="1"
            />
          ))}
          {/* Row 2 */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <rect
              key={`r2-${i}`}
              x={70 + i * 32}
              y="202"
              width="26"
              height="22"
              rx="4"
              className="fill-muted stroke-border"
              strokeWidth="1"
            />
          ))}
          {/* Row 3 - spacebar row */}
          <rect
            x="110"
            y="229"
            width="180"
            height="22"
            rx="4"
            className="fill-muted stroke-border"
            strokeWidth="1"
          />

          {/* Floating "4" key - left */}
          <g className="animate-[float_3s_ease-in-out_infinite]">
            <rect
              x="80"
              y="50"
              width="52"
              height="52"
              rx="8"
              className="fill-primary stroke-primary"
              strokeWidth="1.5"
            />
            <text
              x="106"
              y="84"
              textAnchor="middle"
              className="fill-primary-foreground font-(family-name:--font-doto)"
              fontSize="26"
              fontWeight="bold"
            >
              4
            </text>
          </g>

          {/* Floating "0" key - center */}
          <g className="animate-[float_3s_ease-in-out_0.5s_infinite]">
            <rect
              x="174"
              y="35"
              width="52"
              height="52"
              rx="8"
              className="fill-primary stroke-primary"
              strokeWidth="1.5"
            />
            <text
              x="200"
              y="69"
              textAnchor="middle"
              className="fill-primary-foreground font-(family-name:--font-doto)"
              fontSize="26"
              fontWeight="bold"
            >
              0
            </text>
          </g>

          {/* Floating "4" key - right */}
          <g className="animate-[float_3s_ease-in-out_1s_infinite]">
            <rect
              x="268"
              y="50"
              width="52"
              height="52"
              rx="8"
              className="fill-primary stroke-primary"
              strokeWidth="1.5"
            />
            <text
              x="294"
              y="84"
              textAnchor="middle"
              className="fill-primary-foreground font-(family-name:--font-doto)"
              fontSize="26"
              fontWeight="bold"
            >
              4
            </text>
          </g>

          {/* Connection lines from floating keys to keyboard */}
          <line
            x1="106"
            y1="102"
            x2="106"
            y2="160"
            className="stroke-primary"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.3"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-8"
              dur="1s"
              repeatCount="indefinite"
            />
          </line>
          <line
            x1="200"
            y1="87"
            x2="200"
            y2="160"
            className="stroke-primary"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.3"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-8"
              dur="1s"
              repeatCount="indefinite"
            />
          </line>
          <line
            x1="294"
            y1="102"
            x2="294"
            y2="160"
            className="stroke-primary"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.3"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-8"
              dur="1s"
              repeatCount="indefinite"
            />
          </line>

          {/* Question mark floating particle */}
          <text
            x="155"
            y="130"
            className="fill-muted-foreground"
            fontSize="16"
            opacity="0.4"
          >
            <animate
              attributeName="y"
              values="130;120;130"
              dur="4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.4;0.15;0.4"
              dur="4s"
              repeatCount="indefinite"
            />
            ?
          </text>
          <text
            x="240"
            y="125"
            className="fill-muted-foreground"
            fontSize="12"
            opacity="0.3"
          >
            <animate
              attributeName="y"
              values="125;118;125"
              dur="3.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.3;0.1;0.3"
              dur="3.5s"
              repeatCount="indefinite"
            />
            ?
          </text>
        </svg>

        <h1 className="font-(family-name:--font-doto) text-4xl font-bold text-foreground">
          Page not found
        </h1>

        <p className="mt-3 leading-relaxed text-muted-foreground">
          Looks like you mistyped the URL. Even the best typists miss sometimes.
        </p>

        <Link
          href="/"
          className="mt-6 text-sm text-primary underline-offset-4 hover:underline"
        >
          &#8592; Back to typing test
        </Link>
      </div>
    </main>
  )
}
