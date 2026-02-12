import {
  Box,
  Grid,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  Text,
  Badge,
  HStack,
  VStack,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import useMetrics from '../../hooks/useMetrics';
import { useState } from 'react';
import type { ProjectMetrics } from '../../api/client';

// ── Color palette for CFD bands and charts ──────────────────────
const COLUMN_COLORS = [
  '#9AA6B2', // backlog (muted)
  '#A6D5FA', // blue
  '#C6B3FF', // purple
  '#FFE28A', // yellow
  '#9AE6B4', // green
  '#FF8A8A', // red
  '#8EEFE0', // teal
  '#E9D8FF', // lavender
];

interface MetricsViewProps {
  projectId: string;
}

export default function MetricsView({ projectId }: MetricsViewProps) {
  const [days, setDays] = useState(30);
  const { metrics, loading, error } = useMetrics(projectId, days);

  const cardBg = useColorModeValue('white', '#14181D');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.500', '#9AA6B2');
  const tooltipBg = useColorModeValue('#FFFFFF', '#0F1720');

  if (loading && !metrics) {
    return (
      <Box textAlign="center" py={12}>
        <Spinner size="lg" />
        <Text mt={4} color={mutedColor}>Loading metrics...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={12}>
        <Text color="red.400">{error}</Text>
      </Box>
    );
  }

  if (!metrics) return null;

  return (
    <Box>
      {/* Time range selector */}
      <HStack mb={6} justify="space-between" wrap="wrap">
        <Heading size="md" color={textColor}>Flow Metrics</Heading>
        <HStack>
          <Text fontSize="sm" color={mutedColor}>Period:</Text>
          <Select
            size="sm"
            w="140px"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </Select>
        </HStack>
      </HStack>

      {/* Summary Stats Row */}
      <SummaryStats metrics={metrics} cardBg={cardBg} borderColor={borderColor} textColor={textColor} mutedColor={mutedColor} />

      {/* Charts Grid */}
      <Grid
        templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}
        gap={6}
        mt={6}
      >
        {/* Throughput Chart */}
        <ChartCard title="Throughput" subtitle="Tasks completed per day" cardBg={cardBg} borderColor={borderColor} textColor={textColor}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.throughput}>
              <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: mutedColor }} tickFormatter={formatDate} />
              <YAxis tick={{ fontSize: 11, fill: mutedColor }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                labelFormatter={(label) => formatDate(label as string)}
              />
              <Bar dataKey="count" fill="#A6D5FA" radius={[4, 4, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cumulative Flow Diagram */}
        <ChartCard title="Cumulative Flow Diagram" subtitle="Task distribution over time" cardBg={cardBg} borderColor={borderColor} textColor={textColor}>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={metrics.cfd.data}>
              <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: mutedColor }} tickFormatter={formatDate} />
              <YAxis tick={{ fontSize: 11, fill: mutedColor }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                labelFormatter={(label) => formatDate(label as string)}
              />
              <Legend />
              {metrics.cfd.columns.map((col, i) => (
                <Area
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stackId="1"
                  fill={COLUMN_COLORS[i % COLUMN_COLORS.length]}
                  stroke={COLUMN_COLORS[i % COLUMN_COLORS.length]}
                  fillOpacity={0.7}
                  name={col === 'backlog' ? 'Backlog' : col}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>

      {/* WIP & Aging Section */}
      <Grid
        templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}
        gap={6}
        mt={6}
      >
        {/* Current WIP */}
        <ChartCard title="Current WIP" subtitle="Tasks per column vs. limits" cardBg={cardBg} borderColor={borderColor} textColor={textColor}>
          <WipTable currentWip={metrics.currentWip} mutedColor={mutedColor} />
        </ChartCard>

        {/* WIP Age (Aging Work) */}
        <ChartCard title="Aging Work Items" subtitle="In-progress tasks by age" cardBg={cardBg} borderColor={borderColor} textColor={textColor}>
          <AgingTable wipAge={metrics.wipAge} mutedColor={mutedColor} />
        </ChartCard>
      </Grid>
    </Box>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function SummaryStats({
  metrics,
  cardBg,
  borderColor,
  textColor,
  mutedColor,
}: {
  metrics: ProjectMetrics;
  cardBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <Grid
      templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', xl: 'repeat(5, 1fr)' }}
      gap={4}
    >
      <StatCard
        label="Cycle Time"
        value={`${metrics.cycleTime.avg}h`}
        help={`Median: ${metrics.cycleTime.median}h | P85: ${metrics.cycleTime.p85}h`}
        subValue={`${metrics.cycleTime.count} tasks`}
        cardBg={cardBg}
        borderColor={borderColor}
        textColor={textColor}
        mutedColor={mutedColor}
      />
      <StatCard
        label="Lead Time"
        value={`${metrics.leadTime.avg}h`}
        help={`Median: ${metrics.leadTime.median}h | P85: ${metrics.leadTime.p85}h`}
        subValue={`${metrics.leadTime.count} tasks`}
        cardBg={cardBg}
        borderColor={borderColor}
        textColor={textColor}
        mutedColor={mutedColor}
      />
      <StatCard
        label="Board Lead Time"
        value={`${metrics.boardLeadTime.avg}h`}
        help={`Median: ${metrics.boardLeadTime.median}h`}
        subValue={`Committed ${String.fromCodePoint(0x2192)} Done`}
        cardBg={cardBg}
        borderColor={borderColor}
        textColor={textColor}
        mutedColor={mutedColor}
      />
      <StatCard
        label="Completed"
        value={String(metrics.summary.completedInPeriod)}
        help={`In Progress: ${metrics.summary.inProgress}`}
        subValue={`Board: ${metrics.summary.boardTasks} | Backlog: ${metrics.summary.backlogTasks}`}
        cardBg={cardBg}
        borderColor={borderColor}
        textColor={textColor}
        mutedColor={mutedColor}
      />
      <StatCard
        label="Total Tasks"
        value={String(metrics.summary.totalTasks)}
        help={`Board: ${metrics.summary.boardTasks}`}
        subValue={`Backlog: ${metrics.summary.backlogTasks}`}
        cardBg={cardBg}
        borderColor={borderColor}
        textColor={textColor}
        mutedColor={mutedColor}
      />
    </Grid>
  );
}

function StatCard({
  label,
  value,
  help,
  subValue,
  cardBg,
  borderColor,
  textColor,
  mutedColor,
}: {
  label: string;
  value: string;
  help: string;
  subValue: string;
  cardBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="lg" p={4}>
      <Stat>
        <StatLabel color={mutedColor} fontSize="xs">{label}</StatLabel>
        <StatNumber color={textColor} fontSize="2xl">{value}</StatNumber>
        <StatHelpText color={mutedColor} fontSize="xs" mb={0}>{help}</StatHelpText>
        <Text color={mutedColor} fontSize="xs">{subValue}</Text>
      </Stat>
    </Box>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  cardBg,
  borderColor,
  textColor,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  cardBg: string;
  borderColor: string;
  textColor: string;
}) {
  return (
    <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="lg" p={5}>
      <VStack align="start" spacing={1} mb={4}>
        <Heading size="sm" color={textColor}>{title}</Heading>
        <Text fontSize="xs" color="gray.500">{subtitle}</Text>
      </VStack>
      {children}
    </Box>
  );
}

function WipTable({
  currentWip,
  mutedColor,
}: {
  currentWip: ProjectMetrics['currentWip'];
  mutedColor: string;
}) {
  const entries = Object.entries(currentWip);
  if (entries.length === 0) {
    return <Text color={mutedColor} fontSize="sm">No columns configured</Text>;
  }
  return (
    <Table variant="simple" size="sm">
      <Thead>
        <Tr>
          <Th>Column</Th>
          <Th isNumeric>Tasks</Th>
          <Th isNumeric>WIP Limit</Th>
          <Th>Status</Th>
        </Tr>
      </Thead>
      <Tbody>
        {entries.map(([key, col]) => {
          const atLimit = col.wip !== undefined && col.wip > 0 && col.count >= col.wip;
          const overLimit = col.wip !== undefined && col.wip > 0 && col.count > col.wip;
          return (
            <Tr key={key}>
              <Td>{col.title}</Td>
              <Td isNumeric fontWeight="bold">{col.count}</Td>
              <Td isNumeric color={mutedColor}>{col.wip || '-'}</Td>
              <Td>
                {overLimit ? (
                  <Badge colorScheme="red" fontSize="xs">Over Limit</Badge>
                ) : atLimit ? (
                  <Badge colorScheme="yellow" fontSize="xs">At Limit</Badge>
                ) : (
                  <Badge colorScheme="green" fontSize="xs">OK</Badge>
                )}
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}

function AgingTable({
  wipAge,
  mutedColor,
}: {
  wipAge: ProjectMetrics['wipAge'];
  mutedColor: string;
}) {
  if (wipAge.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Text color={mutedColor} fontSize="sm">No in-progress items</Text>
      </Box>
    );
  }

  // Sort by age descending (oldest first)
  const sorted = [...wipAge].sort((a, b) => b.ageHours - a.ageHours);

  return (
    <Table variant="simple" size="sm">
      <Thead>
        <Tr>
          <Th>Task</Th>
          <Th>Column</Th>
          <Th isNumeric>Age</Th>
          <Th>Priority</Th>
        </Tr>
      </Thead>
      <Tbody>
        {sorted.map((item) => (
          <Tr key={item.taskId}>
             <Td maxW="200px">
               <Text noOfLines={1} title={item.title}>{item.title}</Text>
             </Td>
            <Td>{item.column}</Td>
            <Td isNumeric fontWeight="bold">{formatAge(item.ageHours)}</Td>
            <Td>
              <Badge
                colorScheme={
                  item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'yellow' : 'green'
                }
                fontSize="xs"
              >
                {item.priority || 'medium'}
              </Badge>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

function formatDate(dateStr: string | number | Date) {
  const d = new Date(dateStr as string);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatAge(hours: number): string {
  if (hours < 24) return `${Math.round(hours)}h`;
  const d = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}
