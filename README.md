# extract-sql-to-tsv

Working with SQL dumps is super annoying.

## Usage

    node extract.js foo.sql

## What it does

1. finds every `INSERT INTO` statement (assumes one per database row). Tries to handle
   multiline statements (i.e. with free text in them).
2. saves each statement in a list attached to its particular table
3. saves out a file named `<table-name>.tsv` for each table

> Why TSV? Because CSV (and SQL) are incredibly stupid ways to save columnar data.
> Because you can include quotation marks in strings, CSV and SQL need stateful 
> parsers and have all kinds of awful edge cases, whereas TSV can be parsed with a 
> single line of code.

It has been tested on exactly one postgres file, but this file did include a lot of 
user-generated text with idiotic  stuff like `''` being typed in text fields instead 
of `"`.

I'm making this available publicly for free just in face someone else finds it helpful.
And I'm putting it in github so I never have to do it again.

Cheers!
