; Keywords
"fn" @keyword.function
"extern" @keyword
"struct" @keyword
"enum" @keyword
"import" @keyword
"as" @keyword
"let" @keyword
"return" @keyword.return
"if" @keyword.conditional
"else" @keyword.conditional
"while" @keyword.repeat

; Declarations
(function_declaration name: (identifier) @function)
(extern_function_declaration name: (identifier) @function)
(struct_declaration name: (identifier) @type.definition)
(enum_declaration name: (identifier) @type.definition)

; Types
(parameter type: (identifier) @type)
(struct_field type: (identifier) @type)
(function_declaration return_type: (identifier) @type)
(extern_function_declaration return_type: (identifier) @type)

; Enum variants
(enum_variant (identifier) @constant)

; Struct init path — highlight the type name (last segment)
(struct_init_path (identifier) @type)

; Variables
(let_statement name: (identifier) @variable)
(assignment_statement name: (identifier) @variable)
(parameter name: (identifier) @variable.parameter)
(struct_field name: (identifier) @variable.member)
(field_expression field: (identifier) @variable.member)
(struct_init_field name: (identifier) @variable.member)

; Calls
(call_expression function: (identifier) @function.call)
(call_expression function: (field_expression field: (identifier) @function.method))

; Intrinsics
"@" @punctuation.special
(intrinsic_call name: (identifier) @function.builtin)

; Imports
(import_path (identifier) @module)

; Literals
(bool_literal) @constant.builtin
(integer_literal) @number
(float_literal) @number.float
(string_literal) @string

; Comments
(line_comment) @comment

; Operators
(binary_expression operator: _ @operator)
(unary_expression operator: _ @operator)
"=" @operator

; Punctuation
["(" ")" "{" "}"] @punctuation.bracket
["," ";" ":"] @punctuation.delimiter
"." @punctuation.delimiter
