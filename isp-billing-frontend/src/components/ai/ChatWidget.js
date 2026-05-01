import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Chat as ChatIcon, Close as CloseIcon, Send as SendIcon } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import aiService from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';

const buildSessionId = () => `session-${Date.now()}`;

const TypingIndicator = () => (
  <Box display="flex" gap={0.6} alignItems="center" sx={{ py: 0.5 }}>
    <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: 'typingPulse 1s infinite ease-in-out' }} />
    <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: 'typingPulse 1s 0.2s infinite ease-in-out' }} />
    <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: 'typingPulse 1s 0.4s infinite ease-in-out' }} />
  </Box>
);

const ChatWidget = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const threadRef = useRef(null);
  const customerId = user?.id;

  const hasStarterMessage = useMemo(
    () => messages.some((msg) => msg.role === 'assistant' && msg.isStarter),
    [messages]
  );

  useEffect(() => {
    if (isOpen && !hasStarterMessage) {
      setMessages((prev) => ([
        ...prev,
        {
          role: 'assistant',
          content: "Hello! I'm your AI support assistant. I can help you with billing questions, subscription details, and account information.",
          timestamp: new Date().toISOString(),
          isStarter: true,
        },
      ]));
    }
  }, [isOpen, hasStarterMessage]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || !customerId || isTyping) return;

    const nextSessionId = sessionId || buildSessionId();
    if (!sessionId) {
      setSessionId(nextSessionId);
    }

    setMessages((prev) => ([
      ...prev,
      {
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      },
    ]));
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await aiService.chat(customerId, text, nextSessionId);
      const reply = response.data?.reply || response.data?.message || 'I was unable to generate a response right now.';

      setMessages((prev) => ([
        ...prev,
        {
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        },
      ]));
    } catch (error) {
      const fallback = error.response?.data?.message || error.message || 'AI assistant is temporarily unavailable.';
      setMessages((prev) => ([
        ...prev,
        {
          role: 'assistant',
          content: fallback,
          timestamp: new Date().toISOString(),
        },
      ]));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 1500,
        }}
      >
        <Button
          variant="contained"
          onClick={() => setIsOpen((prev) => !prev)}
          startIcon={<ChatIcon />}
          sx={{
            borderRadius: 999,
            px: 2,
            py: 1.1,
            textTransform: 'none',
            fontWeight: 700,
            boxShadow: theme.shadows[8],
          }}
        >
          AI Assistant
        </Button>
      </Box>

      {isOpen && (
        <Paper
          elevation={10}
          sx={{
            position: 'fixed',
            right: isMobile ? 12 : 20,
            bottom: isMobile ? 82 : 86,
            width: isMobile ? 'calc(100vw - 24px)' : 300,
            height: isMobile ? 420 : 400,
            zIndex: 1500,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Box
            sx={{
              px: 1.5,
              py: 1.2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: theme.palette.primary.contrastText }}>
              AI Support Assistant
            </Typography>
            <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: theme.palette.primary.contrastText }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box
            ref={threadRef}
            sx={{
              flex: 1,
              px: 1.2,
              py: 1,
              overflowY: 'auto',
              background: alpha(theme.palette.background.default, 0.6),
            }}
          >
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              return (
                <Box
                  key={`${message.timestamp}-${index}`}
                  sx={{
                    mb: 1,
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '85%',
                      px: 1.2,
                      py: 0.9,
                      borderRadius: 2,
                      background: isUser
                        ? theme.palette.primary.main
                        : alpha(theme.palette.grey[500], 0.16),
                      color: isUser
                        ? theme.palette.primary.contrastText
                        : theme.palette.text.primary,
                    }}
                  >
                    <Typography variant="body2">{message.content}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        opacity: 0.75,
                        textAlign: isUser ? 'right' : 'left',
                      }}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>
              );
            })}

            {isTyping && (
              <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-start' }}>
                <Box
                  sx={{
                    px: 1.2,
                    py: 0.8,
                    borderRadius: 2,
                    background: alpha(theme.palette.grey[500], 0.16),
                  }}
                >
                  <TypingIndicator />
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ p: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Ask about billing, plan, or payments..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                multiline
                maxRows={3}
              />
              <Button
                variant="contained"
                onClick={handleSend}
                disabled={isTyping || !inputValue.trim() || !customerId}
                sx={{ minWidth: 42, px: 1 }}
              >
                {isTyping ? <CircularProgress size={16} color="inherit" /> : <SendIcon fontSize="small" />}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      <style>
        {`
          @keyframes typingPulse {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.45; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </>
  );
};

export default ChatWidget;
