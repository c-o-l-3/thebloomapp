import { Box, Text, ScrollArea, Center } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';

export function PhoneSimulator({ content, type, subject, sender, timestamp }) {
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useState(600);

  // Update iframe height when content changes
  useEffect(() => {
    if (type === 'email' && iframeRef.current) {
      const updateHeight = () => {
        try {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            const height = iframeRef.current.contentWindow.document.body.scrollHeight;
            setIframeHeight(height + 50); // Add some buffer
          }
        } catch (e) {
          console.warn('Could not resize iframe', e);
        }
      };
      
      // Need a slight delay to allow rendering
      const timer = setTimeout(updateHeight, 100);
      return () => clearTimeout(timer);
    }
  }, [content, type]);

  return (
    <Center py="xl">
      <Box
        style={{
          width: '375px',
          height: '812px',
          border: '14px solid #1A1A1A',
          borderRadius: '46px',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Notch */}
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '160px',
            height: '34px',
            backgroundColor: '#1A1A1A',
            borderBottomLeftRadius: '20px',
            borderBottomRightRadius: '20px',
            zIndex: 100
          }}
        />

        {/* Status Bar Simulator */}
        <Box h={44} bg={type === 'sms' ? '#F5F5F5' : '#FFFFFF'} style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', padding: '0 24px', alignItems: 'center' }}>
          <Text size="xs" fw={600}>9:41</Text>
          <Box style={{ display: 'flex', gap: 4 }}>
            <Box w={16} h={10} bg="black" style={{ borderRadius: 2 }} />
            <Box w={4} h={10} bg="black" style={{ borderRadius: 2 }} />
          </Box>
        </Box>

        <ScrollArea style={{ flex: 1 }} type="scroll">
          {type === 'email' ? (
            <Box>
              {/* Email Header Simulator */}
              <Box p="md" style={{ borderBottom: '1px solid #eee' }}>
                <Text fw={700} size="md" lh={1.3} mb={4}>{subject}</Text>
                <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Box w={32} h={32} bg="#2C3E50" style={{ borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                    CE
                  </Box>
                  <Box>
                    <Text size="sm" fw={600}>Lisa from Cameron Estate</Text>
                    <Text size="xs" c="dimmed">To: You</Text>
                  </Box>
                </Box>
              </Box>
              
              {/* Email Content */}
              {content ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={content}
                  style={{ 
                    width: '100%', 
                    height: `${iframeHeight}px`, 
                    border: 'none',
                    display: 'block' 
                  }}
                  title="Email Preview"
                  onLoad={() => {
                     if(iframeRef.current && iframeRef.current.contentWindow) {
                         setIframeHeight(iframeRef.current.contentWindow.document.body.scrollHeight + 50);
                     }
                  }}
                />
              ) : (
                <Box p="xl" ta="center">
                  <Text c="dimmed">No content available</Text>
                </Box>
              )}
            </Box>
          ) : (
            <Box p="md" bg="#FFFFFF" h="100%">
              {/* SMS Header */}
              <Center mb="xl">
                <Box ta="center">
                  <Box w={48} h={48} bg="#E5E5EA" mx="auto" mb="xs" style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text size="xl">👤</Text>
                  </Box>
                  <Text size="sm" c="dimmed">Lisa</Text>
                  <Text size="xs" c="dimmed">Cameron Estate Inn</Text>
                </Box>
              </Center>

              <Text size="xs" c="dimmed" ta="center" mb="md">Today {timestamp || '9:41 AM'}</Text>

              <Box
                style={{
                  backgroundColor: '#E9E9EB',
                  borderRadius: '18px',
                  padding: '12px 16px',
                  maxWidth: '80%',
                  marginBottom: '8px',
                  borderBottomLeftRadius: '4px'
                }}
              >
                <Text size="sm" c="black" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{content}</Text>
              </Box>
            </Box>
          )}
        </ScrollArea>
        
        {/* Bottom Home Indicator */}
        <Box h={34} bg={type === 'sms' ? '#FFFFFF' : '#FFFFFF'} style={{ flexShrink: 0, position: 'relative' }}>
             <Box 
               style={{ 
                 position: 'absolute', 
                 bottom: 8, 
                 left: '50%', 
                 transform: 'translateX(-50%)', 
                 width: '134px', 
                 height: '5px', 
                 backgroundColor: '#000000', 
                 borderRadius: '10px' 
               }} 
             />
        </Box>
      </Box>
    </Center>
  );
}
