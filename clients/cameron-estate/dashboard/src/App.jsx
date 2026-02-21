import { AppShell, Burger, Group, Title, Text, ScrollArea, Stack, Timeline, ThemeIcon, Card, Button, Center, Affix, Transition, rem, Badge, Textarea, Paper, ActionIcon, Tooltip } from '@mantine/core';
import { useDisclosure, useHotkeys, useWindowScroll } from '@mantine/hooks';
import { useState, useMemo, useEffect } from 'react';
import { IconMail, IconMessage, IconCheck, IconX, IconArrowLeft, IconArrowRight, IconCalendarEvent, IconDownload, IconDeviceFloppy } from '@tabler/icons-react';
import { PhoneSimulator } from './components/PhoneSimulator';
import payloadData from './data/payload.json';

// Helper to extract day number
const getDay = (str) => {
  const match = str.match(/day\s*(\d+)/i) || str.match(/day(\d+)/i);
  return match ? parseInt(match[1]) : 999;
};

export default function App() {
  const [opened, { toggle }] = useDisclosure();
  const [selectedId, setSelectedId] = useState(null);
  const [scroll, scrollTo] = useWindowScroll();
  const [feedback, setFeedback] = useState(() => {
    try {
      const saved = localStorage.getItem('bloom_client_feedback');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Failed to parse feedback', e);
      return {};
    }
  });

  const handleFeedbackChange = (val) => {
    const newFeedback = { ...feedback, [selectedId]: val };
    setFeedback(newFeedback);
    localStorage.setItem('bloom_client_feedback', JSON.stringify(newFeedback));
  };

  const downloadFeedback = () => {
    const dataStr = JSON.stringify(feedback, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cameron_estate_feedback_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Parse and merge data
  const journeyItems = useMemo(() => {
    const emailItems = Object.entries(payloadData.emails).map(([key, config]) => ({
      id: key,
      ...config,
      type: 'email',
      day: getDay(config.name) || getDay(key),
      preview: config.subject
    }));

    const smsItems = payloadData.sms.map(config => ({
      ...config,
      type: 'sms',
      day: getDay(config.name) || getDay(config.id),
      preview: config.content
    }));

    return [...emailItems, ...smsItems].sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      // If same day, emails first
      if (a.type !== b.type) return a.type === 'email' ? -1 : 1;
      return 0;
    });
  }, []);

  // Set initial selection
  useMemo(() => {
    if (!selectedId && journeyItems.length > 0) {
      setSelectedId(journeyItems[0].id);
    }
  }, [journeyItems, selectedId]);

  const selectedItem = journeyItems.find(item => item.id === selectedId) || journeyItems[0];
  const selectedIndex = journeyItems.findIndex(item => item.id === selectedItem?.id);
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex < journeyItems.length - 1;

  // Day calculations
  const dayItems = journeyItems.filter(item => item.day === selectedItem?.day);
  const currentDayIndex = dayItems.findIndex(item => item.id === selectedItem?.id);
  const totalOnDay = dayItems.length;
  const hasOthersOnDay = totalOnDay > 1;

  const goToNext = () => {
    if (hasNext) {
      setSelectedId(journeyItems[selectedIndex + 1].id);
      scrollTo({ y: 0 });
    }
  };

  const goToPrev = () => {
    if (hasPrev) {
      setSelectedId(journeyItems[selectedIndex - 1].id);
      scrollTo({ y: 0 });
    }
  };

  useHotkeys([
    ['ArrowRight', goToNext],
    ['ArrowLeft', goToPrev],
  ]);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 380,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      layout="alt"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3}>Customer Journey</Title>
          </Group>
          <Button 
            leftSection={<IconDownload size={16} />} 
            variant="light" 
            size="xs" 
            onClick={downloadFeedback}
          >
            Export Feedback
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ overflow: 'hidden' }}>
        <ScrollArea h="100%" type="scroll">
          <Timeline active={selectedIndex} bulletSize={32} lineWidth={2}>
            {journeyItems.map((item, index) => {
              const isSelected = item.id === selectedId;
              const isPast = index <= selectedIndex;
              const isFirstOfDay = index === 0 || journeyItems[index - 1].day !== item.day;
              
              return (
                <Timeline.Item
                  key={item.id}
                  bullet={
                    <ThemeIcon
                      size={22}
                      variant={isSelected ? 'filled' : (isPast ? 'light' : 'outline')}
                      radius="xl"
                      color={item.type === 'email' ? 'blue' : 'green'}
                    >
                      {item.type === 'email' ? <IconMail size={12} /> : <IconMessage size={12} />}
                    </ThemeIcon>
                  }
                  title={
                    <Text size="sm" fw={600} c={isSelected ? 'blue' : 'dimmed'}>
                      {isFirstOfDay ? `Day ${item.day}: ` : ''}{item.name}
                    </Text>
                  }
                >
                  <Card 
                    withBorder={isSelected} 
                    shadow={isSelected ? 'sm' : 'none'} 
                    padding="xs" 
                    radius="md" 
                    bg={isSelected ? 'var(--mantine-color-blue-0)' : 'transparent'}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => {
                      setSelectedId(item.id);
                      if (window.innerWidth < 768) toggle();
                    }}
                  >
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {item.preview}
                    </Text>
                  </Card>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main bg="#F8F9FA">
        {selectedItem ? (
          <Stack align="center" gap="xl" pb={100}>
            {/* Day Indicator */}
            <Stack align="center" gap={4}>
              <Badge 
                size="lg" 
                variant="filled" 
                color="dark" 
                leftSection={<IconCalendarEvent size={14} />}
                styles={{ root: { textTransform: 'none' } }}
              >
                Day {selectedItem.day}
              </Badge>
              {hasOthersOnDay && (
                <Text size="xs" c="dimmed" fw={500}>
                  Message {currentDayIndex + 1} of {totalOnDay}
                </Text>
              )}
            </Stack>

            <PhoneSimulator
              type={selectedItem.type}
              content={selectedItem.type === 'email' ? selectedItem.compiledHtml : selectedItem.content}
              subject={selectedItem.subject}
              sender={selectedItem.sendTime || '9:00 AM'}
              timestamp={selectedItem.type === 'email' ? '9:00 AM' : '9:05 AM'}
            />
            
            <Paper withBorder p="md" radius="md" w="100%" maw={400} shadow="sm">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>Feedback / Notes</Text>
                  {feedback[selectedId] && (
                    <Badge color="green" variant="light" size="sm" leftSection={<IconCheck size={12} />}>
                      Saved
                    </Badge>
                  )}
                </Group>
                <Textarea
                  placeholder="Type your notes here... (Automatically saved)"
                  minRows={3}
                  autosize
                  value={feedback[selectedId] || ''}
                  onChange={(event) => handleFeedbackChange(event.currentTarget.value)}
                />
              </Stack>
            </Paper>

            {/* Desktop/Tablet Navigation */}
            <Group>
              <Button 
                leftSection={<IconArrowLeft size={16} />} 
                onClick={goToPrev} 
                disabled={!hasPrev}
                variant="default"
                size="lg"
              >
                Previous
              </Button>
              <Text size="sm" c="dimmed" fw={500}>
                 {selectedIndex + 1} / {journeyItems.length}
              </Text>
              <Button 
                rightSection={<IconArrowRight size={16} />} 
                onClick={goToNext} 
                disabled={!hasNext}
                variant="filled"
                size="lg"
              >
                Next
              </Button>
            </Group>

            {/* Mobile Floating Navigation */}
            <Affix position={{ bottom: 20, right: 0, left: 0 }} hiddenFrom="sm">
               <Center>
                 <Group bg="white" p="xs" style={{ borderRadius: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #eee' }}>
                    <Button 
                      variant="subtle" 
                      color="gray" 
                      onClick={goToPrev} 
                      disabled={!hasPrev}
                      radius="xl"
                      size="md"
                      px="lg"
                    >
                      <IconArrowLeft size={20} />
                    </Button>
                    <Stack gap={0} align="center" style={{ minWidth: '80px' }}>
                      <Text size="sm" fw={700} lh={1.2}>
                         Day {selectedItem.day}
                      </Text>
                      {hasOthersOnDay && (
                        <Text size="xs" c="dimmed" lh={1}>
                          {currentDayIndex + 1}/{totalOnDay}
                        </Text>
                      )}
                    </Stack>
                    <Button 
                      variant="filled" 
                      onClick={goToNext} 
                      disabled={!hasNext}
                      radius="xl"
                      size="md"
                      px="lg"
                    >
                      <IconArrowRight size={20} />
                    </Button>
                 </Group>
               </Center>
            </Affix>
          </Stack>
        ) : (
          <Text align="center" mt="xl" c="dimmed">Select a journey item to view</Text>
        )}
      </AppShell.Main>
    </AppShell>
  );
}



