
// This is a mock user store. In a real application, this would be a secure database.
// WARNING: Do not use this in production. Passwords are in plain text.

export const users = [
    {
        username: 'admin',
        // In a real app, this would be a securely hashed password.
        password: 'admin_password', 
        isAdmin: true,
    },
    {
        username: 'user1',
        password: 'password1',
        isAdmin: false,
    },
    {
        username: 'user2',
        password: 'password2',
        isAdmin: false,
    }
];
