
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ComparisonResult } from './types';
import { SAMPLE_TRANSCRIPT } from './sampleData';
import { STATIC_CORPUS } from './corpus';

// Initialize Gemini
// NOTE: In a real production app, API keys should be handled via backend proxy.
// For this AI Studio/Vibe Coding demo, process.env.API_KEY is