{{- define "myapp.name" -}}
{{ .Release.Name }}
{{- end -}}

{{- define "myapp.fullname" -}}
{{ .Release.Name }}
{{- end -}}
