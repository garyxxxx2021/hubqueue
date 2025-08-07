
'use client';

import React from 'react';

// Using a separate CSS file or styled-components in a real app would be better,
// but for a self-contained, simple error page, this is sufficient.
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
    borderRight: '1px solid rgba(0, 0, 0, .3)',
    margin: 0,
    marginRight: '20px',
    padding: '10px 23px 10px 0',
    fontSize: '24px',
    fontWeight: 500,
    verticalAlign: 'top',
};

const messageStyles: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'normal',
    lineHeight: 'inherit',
    margin: 0,
    padding: 0,
}

const hrStyles: React.CSSProperties = {
    width: '50%',
    border: 'none',
    borderTop: '1px solid #eaeaea',
    margin: '20px auto',
}

const footerStyles: React.CSSProperties = {
    color: '#666',
    fontSize: '14px',
}


export default function SelfDestructPage() {
  return (
    <div style={pageStyles}>
      <div style={{display: 'inline-block'}}>
        <h1 style={titleStyles}>500</h1>
        <div style={{display: 'inline-block', textAlign: 'left', lineHeight: '49px', height: '49px', verticalAlign: 'middle'}}>
            <h2 style={messageStyles}>Internal Server Error</h2>
        </div>
      </div>
       <hr style={hrStyles} />
       <p style={footerStyles}>nginx</p>
    </div>
  );
}
