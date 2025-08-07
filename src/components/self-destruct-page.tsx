
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

const titleStyles: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
};

const hrStyles: React.CSSProperties = {
    width: '80%',
    maxWidth: '600px',
    border: 'none',
    borderTop: '1px solid #ddd',
    margin: '20px auto',
}

const footerStyles: React.CSSProperties = {
    color: '#333',
    fontSize: '16px',
}


export default function SelfDestructPage() {
  return (
    <div style={pageStyles}>
        <h1 style={titleStyles}>500 Internal Server Error</h1>
        <hr style={hrStyles} />
        <p style={footerStyles}>openresty</p>
    </div>
  );
}
