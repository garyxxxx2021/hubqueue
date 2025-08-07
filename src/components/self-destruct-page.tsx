
'use client';

import React from 'react';

const pageStyles: React.CSSProperties = {
    color: '#000',
    background: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, Roboto, "Segoe UI", "Fira Sans", Avenir, "Helvetica Neue", "Lucida Grande", sans-serif',
    height: '100vh',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
};

const mainContentStyles: React.CSSProperties = {
    width: '100%',
};

const titleStyles: React.CSSProperties = {
    display: 'block',
    margin: '0',
    fontSize: '2em',
    fontWeight: 'bold',
};

const hrStyles: React.CSSProperties = {
    width: '50%',
    maxWidth: '400px',
    border: 'none',
    borderTop: '1px solid #eee',
    margin: '10px auto',
}

const footerStyles: React.CSSProperties = {
    color: '#333',
    fontSize: '1em',
    margin: '0',
}


export default function SelfDestructPage() {
  return (
    <div style={pageStyles}>
      <div style={mainContentStyles}>
        <h1 style={titleStyles}>500 Internal Server Error</h1>
        <hr style={hrStyles} />
        <p style={footerStyles}>openresty</p>
      </div>
    </div>
  );
}
