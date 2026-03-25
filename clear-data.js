// Script to clear all invoices, claims, and storage files
// Run: node clear-data.js
// Optional: node clear-data.js --user=<email>  (clear only one user's data)

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const targetEmail = process.argv.find((a) => a.startsWith('--user='))?.split('=')[1]

async function clearData() {
  console.log('==============================================')
  console.log(' ITC Saathi — Clear Invoices & Claims')
  console.log('==============================================')
  if (targetEmail) console.log(` Targeting user: ${targetEmail}`)
  else console.log(' Targeting: ALL users')
  console.log('')

  // Resolve user ID if email provided
  let userId = null
  if (targetEmail) {
    const { data: users } = await supabase.auth.admin.listUsers()
    const match = users?.users?.find((u) => u.email === targetEmail)
    if (!match) {
      console.error(`❌ User not found: ${targetEmail}`)
      process.exit(1)
    }
    userId = match.id
    console.log(`✓ Found user ID: ${userId}`)
  }

  // 1. Fetch invoices to delete storage files
  console.log('\n[1/4] Fetching invoices...')
  let invoiceQuery = supabase.from('invoices').select('id, file_url, user_id')
  if (userId) invoiceQuery = invoiceQuery.eq('user_id', userId)
  const { data: invoices, error: fetchErr } = await invoiceQuery
  if (fetchErr) { console.error('❌ Failed to fetch invoices:', fetchErr.message); process.exit(1) }
  console.log(`✓ Found ${invoices.length} invoice(s)`)

  // 2. Delete files from Supabase Storage
  if (invoices.length > 0) {
    console.log('\n[2/4] Deleting storage files...')
    const storagePaths = invoices
      .map((inv) => {
        // Extract path from URL: .../storage/v1/object/public/invoices/<path>
        const match = inv.file_url?.match(/invoices\/(.+)$/)
        return match ? match[1] : null
      })
      .filter(Boolean)

    if (storagePaths.length > 0) {
      const { error: storageErr } = await supabase.storage.from('invoices').remove(storagePaths)
      if (storageErr) console.warn('  ⚠ Storage delete warning:', storageErr.message)
      else console.log(`  ✓ Deleted ${storagePaths.length} file(s) from storage`)
    } else {
      console.log('  ✓ No storage files to delete')
    }
  } else {
    console.log('\n[2/4] No storage files to delete')
  }

  // 3. Delete ITC claims
  console.log('\n[3/4] Deleting ITC claims...')
  let claimsQuery = supabase.from('itc_claims').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (userId) claimsQuery = supabase.from('itc_claims').delete().eq('user_id', userId)
  const { error: claimsErr, count: claimsCount } = await claimsQuery
  if (claimsErr) { console.error('❌ Failed to delete claims:', claimsErr.message); process.exit(1) }
  console.log(`  ✓ Deleted ITC claims`)

  // 4. Delete invoices
  console.log('\n[4/4] Deleting invoices...')
  let deleteQuery = supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (userId) deleteQuery = supabase.from('invoices').delete().eq('user_id', userId)
  const { error: invoicesErr } = await deleteQuery
  if (invoicesErr) { console.error('❌ Failed to delete invoices:', invoicesErr.message); process.exit(1) }
  console.log(`  ✓ Deleted invoices`)

  console.log('\n==============================================')
  console.log(' ✅ Done! All invoices and claims cleared.')
  console.log('==============================================\n')
}

clearData().catch((err) => {
  console.error('Unexpected error:', err.message)
  process.exit(1)
})
