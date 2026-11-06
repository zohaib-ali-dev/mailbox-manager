'use client';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import { LocalTime } from '@/components/feedback/LocalTime';
import { ACTOR_LABELS, summariseEventMetadata } from '@/lib/order-display';
import type { ActorType } from '@/shared/constants';
import type { OrderEventDto } from '@/shared/types/order.dto';
import { tokens } from '@/styles/theme';
import { OrderStatusChip } from './OrderStatusChip';

/** Actor colour from the audit.actor* tokens. */
function actorColour(theme: Theme, actor: ActorType): string {
  const audit = tokens(theme).audit;
  switch (actor) {
    case 'CUSTOMER':
      return audit.actorCustomerText;
    case 'ADMIN':
      return audit.actorAdminText;
    case 'WORKER':
      return audit.actorWorkerText;
    case 'SYSTEM':
      return audit.actorSystemText;
  }
}

/** The audit log, oldest first: when, what changed, who did it, why, and a short summary. */
export function AuditLogTimeline({ events }: { events: OrderEventDto[] }) {
  return (
    <Card component="section" aria-labelledby="audit-title" sx={{ p: 2.5 }}>
      <Typography id="audit-title" variant="h3" component="h2" sx={{ mb: 2 }}>
        Audit log
      </Typography>
      <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {events.map((event, index) => {
          const summary = summariseEventMetadata(event);
          const isLast = index === events.length - 1;
          return (
            <Box
              component="li"
              key={event.id}
              sx={{ position: 'relative', pl: 3.5, pb: isLast ? 0 : 2.5 }}
            >
              <Box
                aria-hidden
                sx={(theme) => ({
                  position: 'absolute',
                  left: 5,
                  top: 6,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: tokens(theme).audit.dotBg,
                  border: `2px solid ${isLast ? actorColour(theme, event.actorType) : tokens(theme).audit.dotBorder}`,
                })}
              />
              {!isLast ? (
                <Box
                  aria-hidden
                  sx={(theme) => ({
                    position: 'absolute',
                    left: 10,
                    top: 22,
                    bottom: 2,
                    width: 2,
                    borderRadius: 1,
                    bgcolor: tokens(theme).audit.timelineLine,
                  })}
                />
              ) : null}
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
              >
                {event.fromStatus === null ? (
                  <>
                    <Typography variant="subtitle2" component="span">
                      Created
                    </Typography>
                    <OrderStatusChip status={event.toStatus} />
                  </>
                ) : (
                  <>
                    <OrderStatusChip status={event.fromStatus} />
                    <ArrowForwardIcon
                      aria-label="to"
                      sx={{ fontSize: 16, color: 'text.secondary' }}
                    />
                    <OrderStatusChip status={event.toStatus} />
                  </>
                )}
              </Stack>
              <Typography variant="body2" sx={{ mt: 0.75 }}>
                <Box
                  component="span"
                  sx={(theme) => ({ fontWeight: 650, color: actorColour(theme, event.actorType) })}
                >
                  {ACTOR_LABELS[event.actorType]}
                </Box>
                {event.actorLabel ? (
                  <Box component="span" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
                    {' '}
                    {event.actorLabel}
                  </Box>
                ) : null}
              </Typography>
              {event.reason || summary ? (
                <Typography
                  variant="body2"
                  sx={(theme) => ({ color: tokens(theme).audit.reasonText, mt: 0.25 })}
                >
                  {[event.reason, summary].filter(Boolean).join('. ')}
                </Typography>
              ) : null}
              <Typography
                variant="caption"
                component="p"
                sx={(theme) => ({ color: tokens(theme).audit.timestampText, mt: 0.25 })}
              >
                <LocalTime iso={event.createdAt} />
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}
