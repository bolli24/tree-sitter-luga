const PREC = {
  EQUALITY: 1,
  COMPARISON: 2,
  ADDITIVE: 3,
  MULTIPLICATIVE: 4,
  UNARY: 5,
  CALL: 6,
};

module.exports = grammar({
  name: 'luga',

  extras: $ => [/\s+/, $.line_comment],

  word: $ => $.identifier,

  conflicts: $ => [
    // `Foo { ... }` could start a struct_init or an identifier expression
    // followed by a block; GLR resolves by seeing field:value inside the braces.
    [$.struct_init_path, $._expression],
  ],

  rules: {
    source_file: $ => repeat($._top_level_item),

    // -------------------------------------------------------------------------
    // Top-level items
    // -------------------------------------------------------------------------

    _top_level_item: $ => choice(
      $.function_declaration,
      $.extern_function_declaration,
      $.struct_declaration,
      $.enum_declaration,
      $.import_declaration,
    ),

    // fn name(params): ReturnType { body }
    function_declaration: $ => seq(
      'fn',
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional(seq(':', field('return_type', $.identifier))),
      field('body', $.block),
    ),

    // extern fn name(params): ReturnType;
    extern_function_declaration: $ => seq(
      'extern',
      'fn',
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional(seq(':', field('return_type', $.identifier))),
      ';',
    ),

    parameter_list: $ => seq(
      '(',
      commaSep($.parameter),
      ')',
    ),

    parameter: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $.identifier),
    ),

    // struct Name { field: Type; ... }
    struct_declaration: $ => seq(
      'struct',
      field('name', $.identifier),
      '{',
      repeat($.struct_field),
      '}',
    ),

    struct_field: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $.identifier),
      ';',
    ),

    // enum Name { Variant1, Variant2 }
    enum_declaration: $ => seq(
      'enum',
      field('name', $.identifier),
      '{',
      commaSep($.enum_variant),
      '}',
    ),

    enum_variant: $ => $.identifier,

    // import path.to.module as alias;
    import_declaration: $ => seq(
      'import',
      field('path', $.import_path),
      optional(seq('as', field('alias', $.identifier))),
      ';',
    ),

    import_path: $ => seq(
      $.identifier,
      repeat(seq('.', $.identifier)),
    ),

    // -------------------------------------------------------------------------
    // Statements
    // -------------------------------------------------------------------------

    block: $ => seq('{', repeat($._statement), '}'),

    _statement: $ => choice(
      $.return_statement,
      $.let_statement,
      $.assignment_statement,
      $.expression_statement,
      $.if_statement,
      $.while_statement,
      $.block,
      $.function_declaration,
      $.struct_declaration,
      $.enum_declaration,
    ),

    return_statement: $ => seq('return', $._expression, ';'),

    let_statement: $ => seq(
      'let',
      field('name', $.identifier),
      '=',
      field('value', $._expression),
      ';',
    ),

    // prec(1) beats expression_statement when the lookahead after identifier is `=`
    assignment_statement: $ => prec(1, seq(
      field('name', $.identifier),
      '=',
      field('value', $._expression),
      ';',
    )),

    expression_statement: $ => seq($._expression, ';'),

    if_statement: $ => seq(
      $.if_clause,
      repeat(seq('else', $.if_clause)),
      optional(seq('else', $.block)),
    ),

    if_clause: $ => seq(
      'if',
      '(',
      field('condition', $._expression),
      ')',
      field('body', $.block),
    ),

    while_statement: $ => seq(
      'while',
      '(',
      field('condition', $._expression),
      ')',
      field('body', $.block),
    ),

    // -------------------------------------------------------------------------
    // Expressions
    // -------------------------------------------------------------------------

    _expression: $ => choice(
      $.binary_expression,
      $.unary_expression,
      $.call_expression,
      $.field_expression,
      $.struct_init,
      $.intrinsic_call,
      $.parenthesized_expression,
      $.identifier,
      $.integer_literal,
      $.float_literal,
      $.string_literal,
      $.bool_literal,
    ),

    binary_expression: $ => choice(
      prec.left(PREC.EQUALITY, seq(
        field('left', $._expression),
        field('operator', choice('==', '!=')),
        field('right', $._expression),
      )),
      prec.left(PREC.COMPARISON, seq(
        field('left', $._expression),
        field('operator', choice('<', '>', '<=', '>=')),
        field('right', $._expression),
      )),
      prec.left(PREC.ADDITIVE, seq(
        field('left', $._expression),
        field('operator', choice('+', '-')),
        field('right', $._expression),
      )),
      prec.left(PREC.MULTIPLICATIVE, seq(
        field('left', $._expression),
        field('operator', choice('*', '/')),
        field('right', $._expression),
      )),
    ),

    unary_expression: $ => prec(PREC.UNARY, seq(
      field('operator', '!'),
      field('operand', $._expression),
    )),

    call_expression: $ => prec(PREC.CALL, seq(
      field('function', $._expression),
      field('arguments', $.argument_list),
    )),

    field_expression: $ => prec.left(PREC.CALL, seq(
      field('value', $._expression),
      '.',
      field('field', $.identifier),
    )),

    argument_list: $ => seq(
      '(',
      commaSep($._expression),
      ')',
    ),

    // Path.To.Struct { field: expr, ... }
    struct_init: $ => seq(
      field('path', $.struct_init_path),
      '{',
      commaSep($.struct_init_field),
      '}',
    ),

    // Separate rule so it doesn't go through _expression (avoids left-recursion
    // conflicts with field_expression eating the dots).
    struct_init_path: $ => seq(
      $.identifier,
      repeat(seq('.', $.identifier)),
    ),

    struct_init_field: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $._expression),
    ),

    // @intrinsic(args)
    intrinsic_call: $ => seq(
      '@',
      field('name', $.identifier),
      field('arguments', $.argument_list),
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    // -------------------------------------------------------------------------
    // Literals and atoms
    // -------------------------------------------------------------------------

    // Float must be tried before integer so `1.0` isn't lexed as `1` + `.0`.
    float_literal: $ => token(prec(1, /\d+\.\d+/)),
    integer_literal: $ => /\d+/,

    string_literal: $ => token(seq(
      '"',
      repeat(choice(/[^"\\\n]/, /\\./)),
      '"',
    )),

    bool_literal: $ => choice('true', 'false'),

    identifier: $ => /[a-zA-Z][a-zA-Z0-9_]*/,

    line_comment: $ => token(seq('//', /.*/)),
  },
});

function commaSep(rule) {
  return optional(seq(rule, repeat(seq(',', rule)), optional(',')));
}
