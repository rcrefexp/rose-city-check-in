#!/bin/bash

# This script helps set up Firebase for your project

# Install Firebase CLI if not already installed
echo "Installing Firebase CLI..."
npm install -g firebase-tools

# Login to Firebase (you'll need to follow the prompts)
echo "Logging in to Firebase..."
firebase login

# Initialize Firebase features (Hosting, Database)
echo "Initializing Firebase..."
firebase init hosting
firebase init database

echo "Firebase initialization complete!"
echo "Make sure your database rules are properly set in database.rules.json"
echo "You can now deploy with 'firebase deploy'"
