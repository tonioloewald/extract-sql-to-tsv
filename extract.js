// extracts tables from sql dump as TSV
// node extract.js foo.sql

const fs = require('fs')

function fatalError (...args) {
  console.error(...args)
  process.exit()
}

const [,, fileName] = process.argv

function getCells (sqlString) {
  const cells = []
  const origString = sqlString
  // attempt to fix bizarre JSON encoding
  sqlString = sqlString.replace(/''([^':]+)'':/g, '"$1":')
    .replace(/: ''([^':]*)''/g, ': "$1"')
  while (sqlString) {
    if (sqlString.startsWith('\'\', ') || sqlString === '\'\'') {
      cells.push('')
      sqlString = sqlString.substring(4)
    } else if (sqlString.startsWith('\'')) {
      let endIndex
      try {
        endIndex = sqlString.match(/([^']|'')'(,|$)/).index
      } catch (e) {
        console.error('cell termination error', e, sqlString, origString)
        process.exit()
      }
      cells.push(sqlString.substring(1, endIndex + 1))
      sqlString = sqlString.substring(endIndex + 4)
    } else {
      const endIndex = sqlString.indexOf(',')
      cells.push(sqlString.substring(0, endIndex))
      sqlString = endIndex > -1 ? sqlString.substring(endIndex + 2) : ''
    }
  }
  return cells
}

fs.readFile(fileName, 'utf8', (err, source) => {
  if (err) {
    fatalError(err)
    return
  }

  const lines = source.split('\n')
  const tables = {}

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (line && line.startsWith('INSERT INTO')) {
      const tableName = line.split(' ')[2]
      const record = [line]
      while (line != null && !line.match(/(, \w+|')\);$/)) {
        i += 1
        line = lines[i]
        record.push(line)
      }
      if (!tables[tableName]) {
        tables[tableName] = {
          inserts: []
        }
      }
      tables[tableName].inserts.push(record.join('\\n'))
    }
  }

  Object.keys(tables).forEach(tableName => {
    const table = tables[tableName]
    const { inserts } = table
    const columns = inserts[0].match(/\(([^)]+)\) VALUES/)[1].split(', ').map(x => x.startsWith('"') ? x.substring(1, x.length - 2) : x)
    const rows = [columns]

    inserts.forEach(insert => {
      let cellData, cells
      try {
        try {
          const startIndex = insert.indexOf(' VALUES (')
          if (startIndex > -1) { cellData = insert.substring(startIndex + 9, insert.length - 2) }
        } catch (e) {
          console.log('cellData error', e, insert)
          process.exit()
        }
        cells = getCells(cellData)
        if (cells.length !== columns.length) {
          const obj = {}
          columns.forEach((key, idx) => {
            obj[key] = cells[idx]
          })
          console.log({ cellData, cells, columns, obj })
          console.error(cells, 'has wrong number of values, found', cells.length, 'expected', columns.length)
          process.exit()
        }
        rows.push(cells)
      } catch (e) {
        console.error('error:', e)
        console.log({ insert, cellData, cells })
        process.exit()
      }
    })
    if (rows.length > 1) {
      const fileName = `${tableName}.tsv`
      const data = rows.map(row => row.join('\t')).join('\n')
      fs.writeFile(fileName, data, (err) => {
        if (err) { console.log(err) } else {
          console.log('saved', inserts.length, `records to ${fileName}`)
        }
      })
    } else {
      console.error('No records found')
    }
  })
})
