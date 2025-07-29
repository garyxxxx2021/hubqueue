import * as React from 'react';

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    viewBox="0 0 512 512"
    {...props}
  >
    <defs>
      <linearGradient id="a">
        <stop offset={0} stopColor="#0046a3" />
        <stop offset={1} stopColor="#00a0e9" />
      </linearGradient>
      <linearGradient
        id="b"
        xlinkHref="#a"
        x1={256}
        x2={256}
        y1={4}
        y2={508}
        gradientUnits="userSpaceOnUse"
      />
    </defs>
    <path
      fill="url(#b)"
      d="M256 4a252 252 0 1 0 0 504 252 252 0 0 0 0-504zm-33.19 103.58h66.38a101.4 101.4 0 0 1 73.53 31.42 103.4 103.4 0 0 1 0 143.54 101.4 101.4 0 0 1-73.53 31.42h-66.38zm66.38 166.38a62.82 62.82 0 0 0 45.54-19.46 64.04 64.04 0 0 0 .1-89.44 62.82 62.82 0 0 0-45.64-19.46h-27.7v128.36zm-105-166.38v206.32h38.68V107.58z"
    />
  </svg>
);

export default Logo;
