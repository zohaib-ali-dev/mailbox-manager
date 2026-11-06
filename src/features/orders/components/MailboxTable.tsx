'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { HeaderHint } from '@/components/feedback/HeaderHint';
import { LocalTime } from '@/components/feedback/LocalTime';
import { pluralize } from '@/lib/format';
import type { MailboxDto } from '@/shared/types/order.dto';
import { tokens } from '@/styles/theme';
import { mutedTextStyles, tableScrollStyles } from '../styles/ordersStyles';
import { MailboxStatusChip } from './MailboxStatusChip';

/** Per-mailbox status (up to 50 rows). Scrolls sideways inside its card on small screens. */
export function MailboxTable({ mailboxes }: { mailboxes: MailboxDto[] }) {
  return (
    <Card component="section" aria-labelledby="mailboxes-title">
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <Typography id="mailboxes-title" variant="h3" component="h2">
          Mailboxes
        </Typography>
        <Typography variant="body2" sx={mutedTextStyles}>
          {pluralize(mailboxes.length, 'mailbox', 'mailboxes')}
        </Typography>
      </Box>
      <Box sx={tableScrollStyles}>
        <Table size="small" sx={{ minWidth: 600 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 56 }}>#</TableCell>
              <TableCell>
                <HeaderHint
                  label="Address"
                  hint="Generated as box-NN-<first 8 characters of the order ID>@<your domain>."
                />
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>
                <HeaderHint
                  label="Provisioned"
                  hint="When the provider confirmed the mailbox, in your local time."
                />
              </TableCell>
              <TableCell>
                <HeaderHint
                  label="Error"
                  hint="The provider's last message for a failed mailbox. Hover a message to read all of it."
                />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mailboxes.map((mailbox) => (
              <TableRow key={mailbox.id} sx={{ '&:last-of-type td': { borderBottom: 0 } }}>
                <TableCell sx={mutedTextStyles}>{mailbox.position}</TableCell>
                <TableCell
                  sx={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    fontSize: '0.8125rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {mailbox.address}
                </TableCell>
                <TableCell>
                  <MailboxStatusChip status={mailbox.status} />
                </TableCell>
                <TableCell sx={mutedTextStyles}>
                  {mailbox.provisionedAt ? <LocalTime iso={mailbox.provisionedAt} /> : 'Not yet'}
                </TableCell>
                <TableCell sx={{ width: 200 }}>
                  {mailbox.lastError ? (
                    <Tooltip title={mailbox.lastError}>
                      <Typography
                        variant="body2"
                        tabIndex={0}
                        sx={(theme) => ({
                          color: tokens(theme).status.failedText,
                          // A fixed width makes long provider errors end in an ellipsis (full
                          // text in the tooltip) instead of being cut off by the card edge.
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        })}
                      >
                        {mailbox.lastError}
                      </Typography>
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" sx={mutedTextStyles} aria-label="No error">
                      None
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
}
