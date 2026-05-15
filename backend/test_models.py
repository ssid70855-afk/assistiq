import google.generativeai as genai
genai.configure(api_key='AIzaSyB_pb82nqqU7bQ6IUt28Cyudy9s5xRdjiM')
for m in genai.list_models():
    print(m.name)
